"""Integration test: full multi-agent pipeline over a fixture index.

Asserts: an answer is produced, citations point to real ingested documents, and
incident questions surface a resolution (groundedness check).
Uses an isolated temp Qdrant path so it never touches the running server.
"""
import asyncio
import os
import tempfile

import pytest

os.environ["QDRANT_PATH"] = tempfile.mkdtemp(prefix="qdrant_test_")


def _ingest_fixture():
    from indexing.hybrid_index import get_index
    from ingestion.chunking import chunk_document
    from ingestion.connectors import CONNECTORS
    index = get_index()
    ingested_urls = set()
    for conn in CONNECTORS.values():
        for doc in conn():
            index.upsert_chunks(chunk_document(doc))
            ingested_urls.add(doc["url"])
    return index, ingested_urls


def test_hybrid_search_returns_relevant_chunks():
    index, _ = _ingest_fixture()
    hits = index.search("account locked after failed logins", limit=5)
    assert hits, "hybrid search returned nothing"
    assert any(h["source_type"] == "servicenow" for h in hits)


@pytest.mark.skipif(not os.environ.get("EMERGENT_LLM_KEY"), reason="LLM key required")
def test_full_pipeline_grounded_incident_answer():
    _, ingested_urls = _ingest_fixture()
    from agents.pipeline import run_query
    res = asyncio.run(run_query(
        "A pod is stuck in CrashLoopBackOff after deploy. Has this happened before?", ["all"]))

    assert res["answer"].strip(), "no answer produced"
    assert res["citations"], "no citations produced"
    # citations point to real ingested documents
    for c in res["citations"]:
        assert c["url"] in ingested_urls, f"citation url not from ingested set: {c['url']}"
    # incident question surfaces a resolution from ServiceNow
    assert any(c["source_type"] == "servicenow" for c in res["citations"])
    assert "resolution" in res["answer"].lower() or "suggested resolution" in res["answer"].lower()
    assert res["insufficient"] is False
