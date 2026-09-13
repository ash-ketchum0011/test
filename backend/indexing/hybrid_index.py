"""Qdrant single-collection hybrid index: dense (semantic) + sparse (BM25),
merged with Reciprocal Rank Fusion, then a free CPU cross-encoder re-ranker.

All embedding/rerank models are local open-source (fastembed) => $0 per call.
"""
from __future__ import annotations
import os
import threading
import uuid
from typing import Any, Dict, List, Optional

from qdrant_client import QdrantClient, models

DENSE_MODEL = os.environ.get("DENSE_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
SPARSE_MODEL = os.environ.get("SPARSE_MODEL", "Qdrant/bm25")
RERANK_MODEL = os.environ.get("RERANK_MODEL", "Xenova/bge-reranker-base")
COLLECTION = "knowledge"
_RRF_K = 60


class HybridIndex:
    def __init__(self, path: str):
        os.makedirs(path, exist_ok=True)
        self.client = QdrantClient(path=path)
        self._reranker = None
        self._lock = threading.Lock()
        self._ensure_collection()

    def _ensure_collection(self):
        if not self.client.collection_exists(COLLECTION):
            self.client.create_collection(
                COLLECTION,
                vectors_config={"dense": models.VectorParams(size=384, distance=models.Distance.COSINE)},
                sparse_vectors_config={"bm25": models.SparseVectorParams(modifier=models.Modifier.IDF)},
            )

    # --- writes ---
    def delete_source(self, source_id: str):
        self.client.delete(
            COLLECTION,
            points_selector=models.FilterSelector(filter=models.Filter(
                must=[models.FieldCondition(key="source_id", match=models.MatchValue(value=source_id))]
            )),
        )

    def upsert_chunks(self, chunks: List[Dict[str, Any]]):
        points = []
        for c in chunks:
            points.append(models.PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, c["chunk_id"])),
                vector={
                    "dense": models.Document(text=c["text"], model=DENSE_MODEL),
                    "bm25": models.Document(text=c["text"], model=SPARSE_MODEL),
                },
                payload=c["payload"],
            ))
        if points:
            self.client.upsert(COLLECTION, points=points)

    # --- reads ---
    def count(self) -> int:
        return self.client.count(COLLECTION, exact=True).count

    def _search_named(self, query: str, using: str, model: str,
                      flt: Optional[models.Filter], limit: int):
        res = self.client.query_points(
            COLLECTION, query=models.Document(text=query, model=model),
            using=using, query_filter=flt, limit=limit, with_payload=True,
        )
        return res.points

    def search(self, query: str, source_types: Optional[List[str]] = None, limit: int = 8):
        flt = None
        if source_types:
            flt = models.Filter(must=[models.FieldCondition(
                key="source_type", match=models.MatchAny(any=source_types))])
        dense = self._search_named(query, "dense", DENSE_MODEL, flt, limit * 3)
        sparse = self._search_named(query, "bm25", SPARSE_MODEL, flt, limit * 3)

        ranks: Dict[Any, Dict[str, Any]] = {}

        def fuse(points, kind):
            for i, p in enumerate(points):
                e = ranks.setdefault(p.id, {"payload": p.payload, "rrf": 0.0, "dense": None, "sparse": None})
                e["rrf"] += 1.0 / (_RRF_K + i + 1)
                e[kind] = round(float(p.score), 4)

        fuse(dense, "dense")
        fuse(sparse, "sparse")
        merged = sorted(ranks.values(), key=lambda x: x["rrf"], reverse=True)[:limit]
        return [{"score": round(m["rrf"], 5), "dense_score": m["dense"],
                 "sparse_score": m["sparse"], **m["payload"]} for m in merged]

    def rerank(self, query: str, docs: List[Dict[str, Any]], top_k: int = 6):
        if not docs:
            return []
        with self._lock:
            if self._reranker is None:
                self._reranker = self._load_reranker()
        scores = list(self._reranker.rerank(query, [d.get("text", "") for d in docs]))
        for d, s in zip(docs, scores):
            d["rerank_score"] = round(float(s), 4)
        docs.sort(key=lambda d: d["rerank_score"], reverse=True)
        return docs[:top_k]

    def _load_reranker(self):
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        try:
            return TextCrossEncoder(model_name=RERANK_MODEL)
        except Exception:
            return TextCrossEncoder(model_name="Xenova/ms-marco-MiniLM-L-6-v2")

    def warmup(self):
        with self._lock:
            if self._reranker is None:
                self._reranker = self._load_reranker()


_INDEX: Optional[HybridIndex] = None
_INDEX_LOCK = threading.Lock()


def get_index() -> HybridIndex:
    global _INDEX
    if _INDEX is None:
        with _INDEX_LOCK:
            if _INDEX is None:
                _INDEX = HybridIndex(os.environ.get("QDRANT_PATH", "/app/rag_storage/qdrant"))
    return _INDEX
