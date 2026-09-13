"""FunctionTools used by the specialist agents. Each writes its candidates to a
distinct session-state key so the parallel fan-out never has write conflicts.
"""
from __future__ import annotations
from typing import List, Optional

from google.adk.tools.tool_context import ToolContext

from indexing.hybrid_index import get_index


def _effective(source_types: Optional[List[str]], tool_context: ToolContext):
    allowed = tool_context.state.get("allowed_sources")
    if not allowed or "all" in allowed:
        return source_types
    if source_types is None:
        return list(allowed)
    return [s for s in source_types if s in allowed]


def _run(query: str, source_types, state_key: str, tool_context: ToolContext):
    scope = _effective(source_types, tool_context)
    if source_types is not None and not scope:
        tool_context.state[state_key] = []
        return {"count": 0, "results": [], "note": "scope disabled by source filter"}
    hits = get_index().search(query, source_types=scope, limit=8)
    tool_context.state[state_key] = hits
    return {"count": len(hits), "results": [
        {"title": h.get("title"), "source_type": h.get("source_type"),
         "score": h.get("score"), "snippet": (h.get("text") or "")[:180]} for h in hits]}


def search_documentation(query: str, tool_context: ToolContext) -> dict:
    """Hybrid search over Confluence pages and Word documents. Use for how-to,
    policy, configuration and runbook questions."""
    return _run(query, ["confluence", "worddoc"], "cand_docs", tool_context)


def search_incidents(query: str, tool_context: ToolContext) -> dict:
    """Hybrid search over resolved ServiceNow incidents (with resolutions).
    Use for 'has this happened before / how was it fixed' questions."""
    return _run(query, ["servicenow"], "cand_incidents", tool_context)


def search_all(query: str, tool_context: ToolContext) -> dict:
    """Fallback hybrid search across every source when scope is unclear."""
    return _run(query, None, "cand_search", tool_context)


def lookup_open_incident(number: str, tool_context: ToolContext) -> dict:
    """Live-query the status of an OPEN/active ServiceNow incident by its number
    (e.g. INC0012999). Open tickets are not indexed and must be looked up live."""
    from ingestion.connectors import live_servicenow_lookup
    result = live_servicenow_lookup(number)
    tool_context.state["live_lookup"] = result
    return result
