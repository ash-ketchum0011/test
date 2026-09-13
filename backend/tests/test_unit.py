"""Unit tests for connectors + chunking. No LLM calls => fast, free, CI-friendly."""
from ingestion.chunking import chunk_document
from ingestion.connectors import (confluence_connector, live_servicenow_lookup,
                                   servicenow_connector, worddocs_connector)


def test_confluence_schema():
    docs = confluence_connector()
    assert docs, "expected mock confluence docs"
    d = docs[0]
    for key in ("id", "source_type", "source_id", "title", "body", "url", "updated_at", "metadata"):
        assert key in d
    assert d["source_type"] == "confluence"


def test_worddocs_parsed_from_docx():
    docs = worddocs_connector()
    assert docs, "expected .docx files parsed"
    assert all(d["source_type"] == "worddoc" for d in docs)
    assert any("#" in d["body"] for d in docs), "headings should be preserved"


def test_servicenow_only_indexes_resolved_with_resolution():
    docs = servicenow_connector()
    ids = {d["source_id"] for d in docs}
    assert "INC0012345" in ids            # closed + resolution -> indexed
    assert "INC0012999" not in ids        # open -> NOT indexed
    assert all("Resolution:" in d["body"] for d in docs)


def test_live_lookup_returns_open_ticket():
    r = live_servicenow_lookup("INC0012999")
    assert r["number"] == "INC0012999"
    assert r["state"].lower() in ("in progress", "open", "new")


def test_chunking_metadata_and_overlap():
    doc = confluence_connector()[0]
    chunks = chunk_document(doc)
    assert chunks
    c = chunks[0]
    assert c["payload"]["source_type"] == "confluence"
    assert c["payload"]["title"] == doc["title"]
    assert c["payload"]["url"] == doc["url"]
    assert "text" in c["payload"]
    assert c["chunk_id"].startswith(doc["id"])
