# Enterprise Knowledge & Incident-Resolution — Multi-Agent RAG (Phase 0)

A production-shaped, **multi-agent Retrieval-Augmented Generation** system that ingests internal
documentation (Confluence, Word docs) and support tickets (ServiceNow), and answers questions with
**grounded citations** and **suggested resolutions**. Built with **Google ADK** for the agents and a
single **Qdrant** collection for **hybrid (vector + BM25)** search. Ships with a web **Chat UI** that
exposes the full **agent trace / events** of every request.

> This repo is **Phase 0** (local venv, free/open-source models, mock data). Phases 1 (Docker) and
> 2 (Kubernetes) are on the backlog — see *Roadmap*.

## Architecture

```
Confluence ─┐
Word Docs ──┼─▶ Ingestion Pipeline ─▶ Parse/Normalize/Chunk/Metadata ─▶ Qdrant Hybrid Index
ServiceNow ─┘                                                                │
                                                                             ▼
                                                                    Orchestrator (LlmAgent)
                                                                             │  rewrites query
                                         ┌───────────────────────────────────┼───────────────────┐
                                         ▼                                   ▼                    ▼
                                 Document Agent                      Incident Agent          Search Agent   (ParallelAgent)
                                 (Confluence+Word)                   (ServiceNow + live)      (all sources)
                                         └───────────────────────────────────┼───────────────────┘
                                                          Re-ranking / Validation (cross-encoder, non-LLM BaseAgent)
                                                                             ▼
                                                          Response Agent (LlmAgent) → grounded answer + citations
```

Every diagram box maps to an ADK construct, wired as:
`SequentialAgent(Orchestrator, ParallelAgent(Document, Incident, Search), RerankValidate, Response)`.

## Cost model (~$0 for a pilot)
| Component | Choice | Cost |
|---|---|---|
| Agent framework | Google ADK | free |
| Embeddings (dense) | `sentence-transformers/all-MiniLM-L6-v2` via fastembed, CPU | $0/call |
| Keyword (sparse) | Qdrant BM25 (fastembed), same collection | $0/call |
| Re-ranker | `bge-reranker-base` cross-encoder, CPU | $0/call |
| Vector + keyword store | self-hosted Qdrant (Apache 2.0) | free |
| LLM | pluggable (see below) | dev via Emergent key / Gemini free tier |

The **only** unavoidable paid element is the LLM at real production volume — call it out, don't silently upgrade.

## Swapping the AI API (LLM)
All agents get their model from `agents/model_provider.py`. Change provider via env only:

```
LLM_PROVIDER=emergent   # emergent | gemini | openai
LLM_MODEL=gpt-5.4
```
- `emergent` → routes through the Emergent OpenAI-compatible proxy (`EMERGENT_LLM_KEY`), for dev/testing.
- `gemini`   → your own `GEMINI_API_KEY` (spec's recommended free tier).
- `openai`   → your own `OPENAI_API_KEY`.
No other code changes are needed to switch.

## Wiring real data sources
Mock data under `data/mock/` is used automatically. To use real systems, set the credentials in `.env`
(`CONFLUENCE_*`, `SERVICENOW_*`, `WORDDOCS_PATH`) and implement the marked live branch in
`ingestion/connectors.py`. Only **closed/resolved** ServiceNow incidents with a resolution are indexed;
open tickets are looked up **live** via the Incident Agent's `lookup_open_incident` tool.

## Run Phase 0
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill in keys

# 1) ingest (idempotent + incremental by content hash)
python -m ingestion.run --source all      # or: confluence | worddocs | servicenow

# 2) serve API (FastAPI) — auto-ingests mock data on first boot
uvicorn server:app --port 8001

# 3) frontend
cd ../frontend && yarn install && yarn start
```
Open the UI, ask a question, and use the **Agent Trace** panel (Pipeline / Events tabs) to inspect the flow.

## Tests
```bash
cd backend && pytest -q
```
- `tests/test_unit.py` — connectors + chunking, no LLM (fast, free).
- `tests/test_pipeline_integration.py` — full agent pipeline over a fixture index; asserts an answer is
  produced, citations point to **real ingested documents**, and incident questions surface a **resolution**
  (groundedness check). The LLM test skips automatically if no key is set.

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/status` | index + per-source counts, provider/model, sample queries |
| POST | `/api/ingest` | `{source: all\|confluence\|worddocs\|servicenow}` |
| POST | `/api/chat` | `{message, sources?}` → answer, citations, stages, events, timings |
| GET | `/api/history/{session_id}` | stored conversation |

## Roadmap (next phases)
- **Phase 1 — Docker**: one Dockerfile per service + `docker-compose` (Qdrant official image).
- **Phase 2 — Kubernetes**: Deployment/Service/ConfigMap/Secret, Qdrant StatefulSet+PVC, ingestion CronJob, HPA, scale-to-zero.
