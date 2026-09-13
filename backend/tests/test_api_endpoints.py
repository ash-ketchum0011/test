"""End-to-end API tests for RAG backend."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env parsing
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

CHAT_TIMEOUT = 90


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/status ----------
class TestStatus:
    def test_status_shape(self, client):
        r = client.get(f"{BASE_URL}/api/status", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["provider"] == "emergent"
        assert d["model"] == "gpt-5.4"
        assert d["total_points"] >= 15
        assert d["sources"]["confluence"]["documents"] == 3
        assert d["sources"]["confluence"]["chunks"] == 9
        assert d["sources"]["worddoc"]["documents"] == 2
        assert d["sources"]["servicenow"]["documents"] == 3
        assert isinstance(d["samples"], list) and len(d["samples"]) >= 4


# ---------- /api/ingest idempotency ----------
class TestIngest:
    def test_ingest_all_idempotent(self, client):
        r = client.post(f"{BASE_URL}/api/ingest", json={"source": "all"}, timeout=120)
        assert r.status_code == 200
        d = r.json()
        # everything should be skipped on the second run (already ingested at startup)
        total_skipped = d.get("skipped", 0)
        total_ingested = d.get("ingested", 0)
        assert total_skipped >= 1, f"Expected skipped>=1 for idempotency, got {d}"
        # Ingested should be zero after startup already indexed content
        assert total_ingested == 0, f"Expected 0 new ingests, got {d}"


# ---------- /api/chat ----------
class TestChat:
    def _post_chat(self, client, message, sources=None):
        payload = {"message": message}
        if sources:
            payload["sources"] = sources
        r = client.post(f"{BASE_URL}/api/chat", json=payload, timeout=CHAT_TIMEOUT)
        assert r.status_code == 200, r.text
        return r.json()

    def test_chat_globalprotect(self, client):
        d = self._post_chat(client, "How do I fix GlobalProtect Portal unreachable on home WiFi?", ["all"])
        assert d["answer"] and len(d["answer"]) > 20
        assert d["insufficient"] is False
        assert len(d["citations"]) >= 1
        for c in d["citations"]:
            assert "index" in c and "title" in c and "url" in c and "source_type" in c
        assert {"orchestrator", "retrieval", "rerank_validation", "response"}.issubset(
            {s.get("stage") for s in d["stages"]}
        )
        assert any(e.get("type") in ("tool_call", "tool_response", "message") for e in d["events"])
        assert d["elapsed_ms"] > 0
        types = {c["source_type"] for c in d["citations"]}
        assert types & {"confluence", "servicenow"}
        # capture session for later
        pytest.session_id = d.get("session_id")

    def test_chat_incident_crashloop(self, client):
        d = self._post_chat(client, "A pod is stuck in CrashLoopBackOff after deploy. Has this happened before?")
        assert d["answer"]
        source_types = {c["source_type"] for c in d["citations"]}
        assert "servicenow" in source_types
        assert "Suggested Resolution" in d["answer"] or "suggested resolution" in d["answer"].lower()

    def test_chat_source_filter_servicenow(self, client):
        d = self._post_chat(client, "password reset policy", ["servicenow"])
        assert d["answer"]
        if d["citations"]:
            types = {c["source_type"] for c in d["citations"]}
            assert types.issubset({"servicenow"}), f"Expected only servicenow citations, got {types}"

    def test_chat_live_open_incident(self, client):
        d = self._post_chat(client, "What is the status of incident INC0012999?")
        assert d["answer"]
        tool_calls = [e for e in d["events"] if e.get("type") == "tool_call"]
        called_tools = [e.get("name") or e.get("tool") or str(e) for e in tool_calls]
        joined = " ".join(str(x) for x in called_tools).lower()
        assert "lookup_open_incident" in joined or "INC0012999" in d["answer"]


# ---------- /api/history ----------
class TestHistory:
    def test_history_after_chat(self, client):
        # start a new session
        r = client.post(f"{BASE_URL}/api/chat", json={"message": "hello, quick check"}, timeout=CHAT_TIMEOUT)
        assert r.status_code == 200
        sid = r.json().get("session_id")
        assert sid
        h = client.get(f"{BASE_URL}/api/history/{sid}", timeout=30)
        assert h.status_code == 200
        data = h.json()
        msgs = data.get("messages") if isinstance(data, dict) else data
        assert isinstance(msgs, list) and len(msgs) >= 2
        roles = [m.get("role") for m in msgs]
        assert "user" in roles and "assistant" in roles
