"""Unified ingestion pipeline: run connectors, dedup by content hash, chunk, index.

CLI:  python -m ingestion.run --source all|confluence|worddocs|servicenow
"""
from __future__ import annotations
import argparse
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from pymongo import MongoClient

from common.schema import content_hash
from ingestion.chunking import chunk_document
from ingestion.connectors import CONNECTORS
from indexing.hybrid_index import get_index


def _db():
    client = MongoClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]


def ingest(source: str = "all") -> Dict[str, Any]:
    sources = list(CONNECTORS.keys()) if source == "all" else [source]
    index = get_index()
    db = _db()
    registry = db["ingest_registry"]
    summary: Dict[str, Any] = {"sources": {}, "ingested": 0, "skipped": 0, "chunks": 0}

    for src in sources:
        docs = CONNECTORS[src]()
        s_ingested = s_skipped = s_chunks = 0
        for doc in docs:
            h = content_hash(doc)
            existing = registry.find_one({"_id": doc["id"]})
            if existing and existing.get("hash") == h:
                s_skipped += 1
                continue
            if existing:
                index.delete_source(doc["source_id"])
            chunks = chunk_document(doc)
            index.upsert_chunks(chunks)
            registry.replace_one({"_id": doc["id"]}, {
                "_id": doc["id"], "hash": h, "source_type": doc["source_type"],
                "title": doc["title"], "url": doc["url"], "updated_at": doc["updated_at"],
                "chunk_count": len(chunks), "indexed_at": datetime.now(timezone.utc).isoformat(),
            }, upsert=True)
            s_ingested += 1
            s_chunks += len(chunks)
        summary["sources"][src] = {"ingested": s_ingested, "skipped": s_skipped, "chunks": s_chunks}
        summary["ingested"] += s_ingested
        summary["skipped"] += s_skipped
        summary["chunks"] += s_chunks

    summary["total_points"] = index.count()
    return summary


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="all",
                        choices=["all", "confluence", "worddocs", "servicenow"])
    args = parser.parse_args()
    print(ingest(args.source))
