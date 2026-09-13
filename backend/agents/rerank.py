"""Re-ranking / validation stage as a plain (non-LLM) ADK BaseAgent.

Merges candidates from the three specialist agents, dedups, re-ranks with a free
cross-encoder, drops low-confidence chunks and flags insufficient evidence.
"""
from __future__ import annotations
import os
from typing import Any, Dict, List

from google.adk.agents import BaseAgent
from google.adk.events import Event, EventActions
from google.genai import types

from indexing.hybrid_index import get_index

RERANK_THRESHOLD = float(os.environ.get("RERANK_THRESHOLD", "-6"))
# If the best re-ranked chunk scores below this, the question is deemed
# out-of-scope for the knowledge base and the assistant refuses to answer.
SUFFICIENCY_THRESHOLD = float(os.environ.get("RERANK_SUFFICIENCY", "-6"))


def _format_context(chunks: List[Dict[str, Any]]) -> str:
    if not chunks:
        return "(no grounded context retrieved)"
    lines = []
    for i, c in enumerate(chunks, 1):
        lines.append(
            f"[{i}] {c.get('title')} — {c.get('source_type')} — {c.get('url')}\n"
            f"{(c.get('text') or '').strip()}"
        )
    return "\n\n".join(lines)


class RerankValidateAgent(BaseAgent):
    async def _run_async_impl(self, ctx):
        state = ctx.session.state
        query = state.get("search_query") or state.get("user_query") or ""

        merged: List[Dict[str, Any]] = []
        seen = set()
        for key in ("cand_docs", "cand_incidents", "cand_search"):
            for h in (state.get(key) or []):
                dedup = h.get("chunk_id") or (h.get("source_id"), h.get("title"))
                if dedup in seen:
                    continue
                seen.add(dedup)
                merged.append(h)

        ranked = get_index().rerank(query, merged, top_k=8) if merged else []
        top_score = ranked[0].get("rerank_score") if ranked else None
        if top_score is None or top_score < SUFFICIENCY_THRESHOLD:
            # Nothing in the knowledge base is relevant -> refuse (grounded-only).
            survivors = []
        else:
            survivors = [d for d in ranked if d.get("rerank_score", 0) >= RERANK_THRESHOLD][:6]
        insufficient = len(survivors) == 0

        delta = {
            "final_chunks": survivors,
            "context_block": _format_context(survivors),
            "insufficient": insufficient,
            "merged_count": len(merged),
        }
        for k, v in delta.items():
            state[k] = v

        note = f"Merged {len(merged)} candidates → re-ranked → kept {len(survivors)}."
        yield Event(author=self.name, actions=EventActions(state_delta=delta),
                    content=types.Content(role="model", parts=[types.Part(text=note)]))
