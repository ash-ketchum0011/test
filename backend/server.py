"""FastAPI server exposing the multi-agent RAG pipeline + ingestion + status."""
from __future__ import annotations
import asyncio
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from agents.pipeline import run_query, stream_query
from indexing.hybrid_index import get_index
from ingestion.run import ingest

app = FastAPI(title="Multi-Agent RAG System")
api = FastAPI()

mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo[os.environ["DB_NAME"]]

SOURCE_META = {
    "confluence": {"label": "Confluence", "connector": "confluence"},
    "worddoc": {"label": "Word Documents", "connector": "worddocs"},
    "servicenow": {"label": "ServiceNow", "connector": "servicenow"},
}

SAMPLE_QUERIES = [
    "How do I fix GlobalProtect 'Portal unreachable' on home WiFi?",
    "My account is locked after failed logins — how do I regain access?",
    "A pod is stuck in CrashLoopBackOff after deploy. Has this happened before?",
    "What is the data backup and restore procedure?",
    "What is the status of incident INC0012999?",
]


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    sources: Optional[List[str]] = None  # subset of confluence|worddoc|servicenow, or ["all"]


class IngestRequest(BaseModel):
    source: str = "all"


@api.get("/")
async def root():
    return {"status": "ok", "service": "multi-agent-rag"}


@api.get("/status")
async def status():
    index = get_index()
    total = await asyncio.to_thread(index.count)
    per_source = {}
    for st, meta in SOURCE_META.items():
        docs = await db["ingest_registry"].count_documents({"source_type": st})
        agg = db["ingest_registry"].aggregate([
            {"$match": {"source_type": st}},
            {"$group": {"_id": None, "chunks": {"$sum": "$chunk_count"}}},
        ])
        chunks = 0
        async for row in agg:
            chunks = row.get("chunks", 0)
        last = await db["ingest_registry"].find_one({"source_type": st}, sort=[("indexed_at", -1)])
        per_source[st] = {"label": meta["label"], "documents": docs, "chunks": chunks,
                          "last_indexed": last.get("indexed_at") if last else None}
    return {"total_points": total, "collection": "knowledge", "index_type": "hybrid (dense + BM25)",
            "provider": os.environ.get("LLM_PROVIDER"), "model": os.environ.get("LLM_MODEL"),
            "sources": per_source, "samples": SAMPLE_QUERIES}


@api.post("/ingest")
async def run_ingest(req: IngestRequest):
    summary = await asyncio.to_thread(ingest, req.source)
    return summary


@api.post("/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(400, "message is required")
    sources = req.sources or ["all"]
    session_id = req.session_id or str(uuid.uuid4())
    result = await run_query(req.message, sources)

    ts = datetime.now(timezone.utc).isoformat()
    await db["chat_history"].insert_many([
        {"session_id": session_id, "role": "user", "content": req.message, "ts": ts},
        {"session_id": session_id, "role": "assistant", "content": result["answer"],
         "citations": result["citations"], "stages": result["stages"],
         "events": result["events"], "elapsed_ms": result["elapsed_ms"],
         "insufficient": result["insufficient"], "rewritten_query": result["rewritten_query"],
         "ts": ts},
    ])
    result["session_id"] = session_id
    return result


@api.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(400, "message is required")
    import json as _json
    from sse_starlette.sse import EventSourceResponse

    sources = req.sources or ["all"]
    session_id = req.session_id or str(uuid.uuid4())

    async def gen():
        done = None
        yield {"data": _json.dumps({"type": "start", "session_id": session_id})}
        async for chunk in stream_query(req.message, sources):
            if chunk.get("type") == "done":
                done = chunk
            yield {"data": _json.dumps(chunk)}
        if done:
            ts = datetime.now(timezone.utc).isoformat()
            await db["chat_history"].insert_many([
                {"session_id": session_id, "role": "user", "content": req.message, "ts": ts},
                {"session_id": session_id, "role": "assistant", "content": done["answer"],
                 "citations": done["citations"], "stages": done["stages"],
                 "events": done["events"], "elapsed_ms": done["elapsed_ms"],
                 "insufficient": done["insufficient"], "rewritten_query": done["rewritten_query"],
                 "ts": ts},
            ])

    return EventSourceResponse(gen())


@api.get("/history/{session_id}")
async def history(session_id: str):
    msgs = []
    async for m in db["chat_history"].find({"session_id": session_id}).sort("ts", 1):
        m.pop("_id", None)
        msgs.append(m)
    return {"session_id": session_id, "messages": msgs}


app.include_router(api.router, prefix="/api")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


def _bootstrap():
    """Auto-ingest mock data on first boot and warm the reranker (background)."""
    try:
        index = get_index()
        if index.count() == 0:
            ingest("all")
        index.warmup()
    except Exception as e:  # noqa
        print("bootstrap error:", e)


@app.on_event("startup")
async def startup():
    threading.Thread(target=_bootstrap, daemon=True).start()
