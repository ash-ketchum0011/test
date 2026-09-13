# PRD — Enterprise Knowledge & Incident-Resolution Multi-Agent RAG

## Original problem statement
Build a production-ready multi-agent RAG system (per `multi-agent-rag-build-prompt.md`) that ingests
Confluence, Word docs and ServiceNow, and answers questions with grounded citations + suggested
resolutions. Hard constraints: Google ADK for all agents, Qdrant hybrid (dense+BM25) index, free/open
models, phase-gated delivery (venv → Docker → K8s). "Leave space for choosing different AI APIs."

## User choices (this build)
- Mock/sample data now; real creds via `.env` later.
- LLM: Emergent Universal key for testing (`LLM_PROVIDER=emergent`, `gpt-5.4`); own Gemini/OpenAI key pluggable.
- Scope: **Phase 0** only (local venv).
- UI: web chat + **events/trace** panel to understand request flow.
- Strictly **google-adk** for agents.

## Architecture
- **Ingestion** (`ingestion/`): 3 idempotent connectors → common schema; content-hash dedup; token chunking (~400 tok, 15% overlap), no LLM.
- **Index** (`indexing/hybrid_index.py`): single Qdrant local collection, dense `all-MiniLM-L6-v2` + BM25 sparse (fastembed), RRF fusion, `bge-reranker-base` cross-encoder. All $0/call.
- **Agents** (`agents/`, Google ADK): `SequentialAgent(Orchestrator, ParallelAgent(Document, Incident, Search), RerankValidate[BaseAgent], Response)`. Model via `model_provider.get_model()` (provider swap by env → OpenAI-compatible Emergent proxy / Gemini / OpenAI).
- **API** (`server.py`, FastAPI): `/api/status`, `/api/ingest`, `/api/chat`, `/api/history/{id}`. Auto-ingests mock data on first boot.
- **Frontend** (React): dark tactical command-center; chat with markdown answer, source-badged citations, Suggested Resolution card; Agent Trace panel (Pipeline + Events); Ingestion dashboard; source filters.

## Tech stack
React (CRA) + Tailwind · FastAPI · MongoDB (registry + chat history) · Qdrant (embedded) · google-adk 2.9 · litellm · fastembed.

## What's been implemented (2026-06)
- Phase 0 complete and verified end-to-end.
- 3 connectors (Confluence/Word .docx/ServiceNow) over mock data; only resolved incidents w/ resolution indexed; open ticket (INC0012999) live-lookup only.
- Hybrid retrieval + RRF + cross-encoder rerank + groundedness/insufficiency flag.
- Full multi-agent graph with per-request trace (stages + ordered events, timings, tool calls, chunk scores).
- Grounded answers with inline [n] citations + Suggested Resolution.
- Web UI with trace/events, ingestion dashboard, source scoping.
- Tests: `tests/test_unit.py` (connectors/chunking, no LLM) + `tests/test_pipeline_integration.py` (full grounded pipeline) + testing-agent suite `tests/test_api_endpoints.py`. Backend 7/7, frontend 100%.
- Deliverables: `README.md`, `.env.example`, pinned `requirements.txt`.

## Backlog / Roadmap
- **P1 — Phase 1 (Docker)**: Dockerfile per service + docker-compose (Qdrant official image), parity with Phase 0.
- **P1 — Phase 2 (Kubernetes)**: Namespace/Deployment/Service/ConfigMap/Secret, Qdrant StatefulSet+PVC, ingestion CronJob, HPA/KEDA scale-to-zero, kind/minikube then GKE.
- **P2**: streaming (SSE) answer tokens; live Confluence/ServiceNow/SharePoint connectors (wire the marked `.env` branches); dedicated `/api/health` readiness probe; auth if multi-tenant.
