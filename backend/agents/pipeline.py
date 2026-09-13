"""Multi-agent graph (Google ADK) mapped 1:1 to the target architecture, plus a
runner that captures a structured trace of every request for the UI.

  SequentialAgent(
     Orchestrator (LlmAgent, rewrites query),
     ParallelAgent(Document, Incident, Search specialist LlmAgents),
     RerankValidate (BaseAgent, cross-encoder),
     Response (LlmAgent, grounded answer + citations),
  )
"""
from __future__ import annotations
import time
import uuid
from typing import Any, Dict, List

from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
from google.adk.runners import InMemoryRunner
from google.adk.tools import FunctionTool
from google.genai import types

from agents.model_provider import get_model
from agents.rerank import RerankValidateAgent
from agents.tools import (lookup_open_incident, search_all, search_documentation,
                          search_incidents)

APP_NAME = "rag_pipeline"

REFUSAL = ("I can only answer questions using the internal knowledge base (Confluence pages, "
           "Word documents, and ServiceNow tickets), and I couldn't find anything relevant to your "
           "question. Try rephrasing, or ask about IT policies, runbooks, or past incidents.")

RESPONSE_INSTRUCTION = """You are the Response Agent of an enterprise knowledge assistant.
You may ONLY use the retrieved context below. You must NOT use any outside or general knowledge,
and you must NOT answer questions that are unrelated to the internal knowledge base (for example:
the current date/time, general trivia, math, coding help, opinions, or anything not found in the context).

Retrieved context:
{context_block}

Rules:
- insufficient=%s below. If insufficient is True, or the retrieved context is empty or does not
  actually answer the question, reply with EXACTLY this text and nothing else (no citations):
  "%s"
- Otherwise, answer using ONLY the context. Ground every statement in it and never invent facts or URLs.
- Add inline citations like [1], [2] that match the numbered context entries you used.
- If the context contains ServiceNow incident resolutions, end with a section headed
  "Suggested Resolution:" summarising the concrete fix steps.
Keep the answer concise, structured and professional.""" % ("{insufficient}", REFUSAL)


def build_pipeline() -> SequentialAgent:
    model = get_model()

    orchestrator = LlmAgent(
        name="orchestrator", model=model, output_key="search_query",
        instruction=(
            "You are the Orchestrator. Classify the user's question and rewrite it into a single, "
            "concise, keyword-rich search query for retrieval across internal documentation and "
            "support tickets. Respond with ONLY the rewritten query text, nothing else."),
    )

    document_agent = LlmAgent(
        name="document_agent", model=model, tools=[FunctionTool(search_documentation)],
        instruction=("Retrieve documentation relevant to this query: {search_query}. "
                     "Call search_documentation exactly once, then reply with a one-sentence summary."),
    )
    incident_agent = LlmAgent(
        name="incident_agent", model=model,
        tools=[FunctionTool(search_incidents), FunctionTool(lookup_open_incident)],
        instruction=("Find past resolved incidents relevant to this query: {search_query}. "
                     "Call search_incidents once. If the user references a specific open incident "
                     "number (INCxxxxxxx), also call lookup_open_incident. Reply with a one-sentence summary."),
    )
    search_agent = LlmAgent(
        name="search_agent", model=model, tools=[FunctionTool(search_all)],
        instruction=("Fallback retrieval across all sources for this query: {search_query}. "
                     "Call search_all exactly once, then reply with a one-sentence summary."),
    )

    specialists = ParallelAgent(name="specialists",
                                sub_agents=[document_agent, incident_agent, search_agent])
    rerank = RerankValidateAgent(name="rerank_validate")
    response = LlmAgent(name="response_agent", model=model, instruction=RESPONSE_INSTRUCTION)

    return SequentialAgent(name=APP_NAME,
                           sub_agents=[orchestrator, specialists, rerank, response])


# --- singleton runner ---
_RUNNER: InMemoryRunner | None = None


def get_runner() -> InMemoryRunner:
    global _RUNNER
    if _RUNNER is None:
        _RUNNER = InMemoryRunner(agent=build_pipeline(), app_name=APP_NAME)
    return _RUNNER


STAGE_LABEL = {
    "orchestrator": "Orchestrator", "document_agent": "Document Agent",
    "incident_agent": "Incident Agent", "search_agent": "Search Agent",
    "rerank_validate": "Re-ranking / Validation", "response_agent": "Response Agent",
}


def _collect_event(ev, rel_ms: int, events: List[Dict[str, Any]]):
    for part in (ev.content.parts if ev.content else []):
        if getattr(part, "function_call", None):
            events.append({"agent": ev.author, "label": STAGE_LABEL.get(ev.author, ev.author),
                           "type": "tool_call", "tool": part.function_call.name,
                           "args": dict(part.function_call.args or {}), "t_ms": rel_ms})
        elif getattr(part, "function_response", None):
            resp = part.function_response.response
            summary = resp.get("count") if isinstance(resp, dict) else None
            events.append({"agent": ev.author, "label": STAGE_LABEL.get(ev.author, ev.author),
                           "type": "tool_response", "tool": part.function_response.name,
                           "count": summary, "t_ms": rel_ms})
        elif getattr(part, "text", None) and part.text.strip():
            events.append({"agent": ev.author, "label": STAGE_LABEL.get(ev.author, ev.author),
                           "type": "message", "text": part.text.strip(), "t_ms": rel_ms})


def _build_result(events: List[Dict[str, Any]], state: dict, elapsed: int) -> Dict[str, Any]:
    answer = ""
    for ev in reversed(events):
        if ev["agent"] == "response_agent" and ev["type"] == "message":
            answer = ev["text"]
            break

    final = state.get("final_chunks") or []
    citations = [{
        "index": i + 1, "title": c.get("title"), "url": c.get("url"),
        "source_type": c.get("source_type"), "section_heading": c.get("section_heading"),
        "rerank_score": c.get("rerank_score"), "snippet": (c.get("text") or "")[:280],
    } for i, c in enumerate(final)]

    def brief(hits):
        return [{"title": h.get("title"), "source_type": h.get("source_type"),
                 "score": h.get("score"), "dense_score": h.get("dense_score"),
                 "sparse_score": h.get("sparse_score"), "snippet": (h.get("text") or "")[:160]}
                for h in (hits or [])]

    stages = [
        {"stage": "orchestrator", "label": "Orchestrator",
         "detail": {"rewritten_query": state.get("search_query")}},
        {"stage": "retrieval", "label": "Parallel Specialist Retrieval",
         "detail": {"document_agent": brief(state.get("cand_docs")),
                    "incident_agent": brief(state.get("cand_incidents")),
                    "search_agent": brief(state.get("cand_search")),
                    "live_lookup": state.get("live_lookup")}},
        {"stage": "rerank_validation", "label": "Re-ranking / Validation",
         "detail": {"merged_count": state.get("merged_count"),
                    "insufficient": state.get("insufficient"),
                    "survivors": [{"title": c.get("title"), "source_type": c.get("source_type"),
                                   "rerank_score": c.get("rerank_score")} for c in final]}},
        {"stage": "response", "label": "Response Agent",
         "detail": {"grounded": not state.get("insufficient"), "citations": len(citations)}},
    ]

    return {"answer": answer, "citations": citations, "stages": stages,
            "events": events, "elapsed_ms": elapsed,
            "insufficient": bool(state.get("insufficient")),
            "rewritten_query": state.get("search_query")}


async def run_query(message: str, allowed_sources: List[str]) -> Dict[str, Any]:
    runner = get_runner()
    uid, sid = "user", str(uuid.uuid4())
    await runner.session_service.create_session(app_name=APP_NAME, user_id=uid, session_id=sid)
    start = time.time()
    events: List[Dict[str, Any]] = []
    async for ev in runner.run_async(
        user_id=uid, session_id=sid,
        new_message=types.Content(role="user", parts=[types.Part(text=message)]),
        state_delta={"allowed_sources": allowed_sources, "user_query": message},
    ):
        _collect_event(ev, int((time.time() - start) * 1000), events)
    elapsed = int((time.time() - start) * 1000)
    session = await runner.session_service.get_session(app_name=APP_NAME, user_id=uid, session_id=sid)
    return _build_result(events, session.state, elapsed)


async def stream_query(message: str, allowed_sources: List[str]):
    """Async generator of pipeline events; streams response tokens as they arrive."""
    from google.adk.agents.run_config import RunConfig, StreamingMode

    runner = get_runner()
    uid, sid = "user", str(uuid.uuid4())
    await runner.session_service.create_session(app_name=APP_NAME, user_id=uid, session_id=sid)
    start = time.time()
    events: List[Dict[str, Any]] = []
    seen = set()

    async for ev in runner.run_async(
        user_id=uid, session_id=sid,
        new_message=types.Content(role="user", parts=[types.Part(text=message)]),
        state_delta={"allowed_sources": allowed_sources, "user_query": message},
        run_config=RunConfig(streaming_mode=StreamingMode.SSE),
    ):
        rel_ms = int((time.time() - start) * 1000)
        author = ev.author
        if author not in seen:
            seen.add(author)
            yield {"type": "step", "agent": author,
                   "label": STAGE_LABEL.get(author, author), "t_ms": rel_ms}

        if getattr(ev, "partial", False):
            if author == "response_agent" and ev.content and ev.content.parts:
                delta = ev.content.parts[0].text
                if delta:
                    yield {"type": "token", "text": delta}
            continue

        for part in (ev.content.parts if ev.content else []):
            if getattr(part, "function_call", None):
                yield {"type": "tool", "agent": author, "label": STAGE_LABEL.get(author, author),
                       "tool": part.function_call.name,
                       "args": dict(part.function_call.args or {}), "t_ms": rel_ms}
        _collect_event(ev, rel_ms, events)

    elapsed = int((time.time() - start) * 1000)
    session = await runner.session_service.get_session(app_name=APP_NAME, user_id=uid, session_id=sid)
    result = _build_result(events, session.state, elapsed)
    yield {"type": "done", **result}
