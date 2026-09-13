"""Guardrail (knowledge-base-only) + stop/streaming regression tests."""
import os
import json
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

CHAT_TIMEOUT = 120

REFUSAL = ("I can only answer questions using the internal knowledge base "
           "(Confluence pages, Word documents, and ServiceNow tickets), and I couldn't "
           "find anything relevant to your question. Try rephrasing, or ask about IT "
           "policies, runbooks, or past incidents.")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Regression: /api/status ----------
class TestStatusRegression:
    def test_status_ok(self, client):
        r = client.get(f"{BASE_URL}/api/status", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["provider"] == "emergent"
        assert d["model"] == "gpt-5.4"
        assert d["total_points"] >= 15
        assert isinstance(d["samples"], list) and len(d["samples"]) >= 4


# ---------- Guardrail: refuse out-of-scope ----------
class TestGuardrailRefusal:
    @pytest.mark.parametrize("msg", [
        "what is today's date?",
        "tell me a joke",
        "write me some python code",
    ])
    def test_refuses_out_of_scope(self, client, msg):
        r = client.post(f"{BASE_URL}/api/chat",
                        json={"message": msg, "sources": ["all"]},
                        timeout=CHAT_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["insufficient"] is True, f"expected insufficient=True for {msg!r}, got {d}"
        assert d["citations"] == [], f"expected no citations, got {d['citations']}"
        assert d["answer"].strip() == REFUSAL, (
            f"refusal text mismatch for {msg!r}.\nGOT: {d['answer']!r}\nEXPECTED: {REFUSAL!r}")


# ---------- Guardrail does NOT over-block ----------
class TestGuardrailInScope:
    def test_locked_account_answered(self, client):
        r = client.post(f"{BASE_URL}/api/chat",
                        json={"message": "my account is locked after failed logins, how do I get back in?"},
                        timeout=CHAT_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["insufficient"] is False, f"got insufficient for in-scope Q: {d.get('answer')}"
        assert len(d["citations"]) >= 1
        types = {c["source_type"] for c in d["citations"]}
        assert "servicenow" in types, f"expected servicenow citation, got {types}"

    def test_db_restore_answered(self, client):
        r = client.post(f"{BASE_URL}/api/chat",
                        json={"message": "how do I restore a database backup?"},
                        timeout=CHAT_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["insufficient"] is False, f"got insufficient for in-scope Q: {d.get('answer')}"
        assert len(d["citations"]) >= 1
        types = {c["source_type"] for c in d["citations"]}
        assert types & {"confluence", "worddoc"}, f"expected doc citation, got {types}"


# ---------- Streaming SSE endpoint (in-scope) ----------
class TestStreamingSSE:
    def test_stream_in_scope(self, client):
        with client.post(f"{BASE_URL}/api/chat/stream",
                         json={"message": "how do I restore a database backup?"},
                         stream=True, timeout=CHAT_TIMEOUT) as r:
            assert r.status_code == 200
            saw_token = False
            saw_done = False
            done_payload = None
            for line in r.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data:"):
                    continue
                try:
                    payload = json.loads(line[5:].strip())
                except Exception:
                    continue
                if payload.get("type") == "token":
                    saw_token = True
                elif payload.get("type") == "done":
                    saw_done = True
                    done_payload = payload
                    break
            assert saw_token, "no token events streamed"
            assert saw_done, "no done event"
            assert done_payload["insufficient"] is False
            assert len(done_payload["citations"]) >= 1

    def test_stream_out_of_scope_refusal(self, client):
        with client.post(f"{BASE_URL}/api/chat/stream",
                         json={"message": "what is today's date?"},
                         stream=True, timeout=CHAT_TIMEOUT) as r:
            assert r.status_code == 200
            final = None
            for line in r.iter_lines(decode_unicode=True):
                if line and line.startswith("data:"):
                    try:
                        payload = json.loads(line[5:].strip())
                    except Exception:
                        continue
                    if payload.get("type") == "done":
                        final = payload
                        break
            assert final is not None
            assert final["insufficient"] is True
            assert final["citations"] == []
            assert final["answer"].strip() == REFUSAL
