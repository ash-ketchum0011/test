import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Boxes, Send, PanelRightOpen, PanelRightClose, Database, Cpu,
  ExternalLink, AlertTriangle, Wrench, RefreshCw, Loader2, BadgeCheck, Terminal, Zap, Square, Sun, Moon,
} from "lucide-react";
import { getStatus, runIngest, streamChat } from "./api";
import { SourceBadge, SOURCE_STYLE } from "./components/badges";
import TracePanel from "./components/TracePanel";

const FILTERS = [
  { key: "all", label: "All Sources" },
  { key: "confluence", label: "Confluence" },
  { key: "worddoc", label: "Word Docs" },
  { key: "servicenow", label: "ServiceNow" },
];

// Maps each streamed agent onto one of the 4 pipeline stages shown in the trace panel.
const STAGE_ORDER = ["orchestrator", "retrieval", "rerank_validation", "response"];
const AGENT_STAGE = {
  orchestrator: "orchestrator", document_agent: "retrieval", incident_agent: "retrieval",
  search_agent: "retrieval", rerank_validate: "rerank_validation", response_agent: "response",
};

function StatBadge({ icon: Icon, label, value }) {
  return (
    <div className="hidden items-center gap-2 rounded-lg border border-subtle bg-card px-3 py-1.5 md:flex">
      <Icon size={14} className="text-sky-400" />
      <span className="text-[11px] text-ink3">{label}</span>
      <span className="font-mono text-xs font-semibold text-ink">{value}</span>
    </div>
  );
}

function Citations({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 border-t border-subtle pt-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink3">Citations</div>
      <div className="space-y-1.5">
        {items.map((c) => (
          <a
            key={c.index}
            href={c.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2 rounded-lg border border-subtle bg-obsidian/50 px-2.5 py-1.5 transition-colors hover:border-sky-500/40 hover:bg-cardhover"
            data-testid="citation-link"
          >
            <span className="font-mono text-xs text-sky-400">[{c.index}]</span>
            <span className="flex-1 truncate text-xs text-ink2 group-hover:text-ink">{c.title}</span>
            <SourceBadge type={c.source_type} />
            <ExternalLink size={12} className="text-ink3 group-hover:text-sky-400" />
          </a>
        ))}
      </div>
    </div>
  );
}

const RES_RE = /\*{0,2}\s*Suggested Resolution\s*:?\s*\*{0,2}/i;

function SuggestedResolution({ body }) {
  if (!body) return null;
  return (
    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3" data-testid="suggested-resolution-card">
      <div className="mb-1.5 flex items-center gap-2 text-emerald-400">
        <BadgeCheck size={15} />
        <span className="text-xs font-bold uppercase tracking-wide">Suggested Resolution</span>
      </div>
      <div className="md text-[13px] text-emerald-100/90">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
    </div>
  );
}

function LiveSteps({ steps }) {
  if (!steps?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="live-pipeline-steps">
      {steps.map((s, i) => (
        <span key={i} className="fade-up inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-brand">
          <Zap size={9} /> {s.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 text-[11px] text-ink3">
        <Loader2 size={11} className="animate-spin" /> working…
      </span>
    </div>
  );
}

function AssistantMessage({ msg, onTrace, liveSteps }) {
  const parts = (msg.answer || "").split(RES_RE);
  const answerNoRes = (parts[0] || "").trim();
  const resolutionBody = parts.length > 1 ? parts.slice(1).join("\n").trim() : "";
  const showThinking = msg.streaming && !msg.answer;
  return (
    <div className="fade-up flex gap-3" data-testid="assistant-message">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10">
        <Cpu size={16} className="text-indigo-400" />
      </span>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-subtle bg-card p-4">
        {showThinking && <LiveSteps steps={liveSteps} />}
        {msg.insufficient && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-300">
            <AlertTriangle size={13} /> Low grounding — answer flagged, verify before acting.
          </div>
        )}
        {!showThinking && (
          <div className="md text-[14px] text-ink">
            <ReactMarkdown>{answerNoRes || "_No answer produced._"}</ReactMarkdown>
            {msg.streaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-sky-400 align-middle" />}
          </div>
        )}
        {!msg.streaming && <SuggestedResolution body={resolutionBody} />}
        {!msg.streaming && <Citations items={msg.citations} />}
        {msg.trace && !msg.streaming && (
          <button
            onClick={() => onTrace(msg.trace)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-subtle bg-obsidian/60 px-2.5 py-1 text-[11px] text-ink2 hover:border-sky-500/40 hover:text-brand"
            data-testid="view-trace-button"
          >
            <Terminal size={12} /> View agent trace · {msg.trace?.elapsed_ms}ms
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState(null);
  const [view, setView] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showTrace, setShowTrace] = useState(true);
  const [activeTrace, setActiveTrace] = useState(null);
  const [ingesting, setIngesting] = useState(false);
  const [liveSteps, setLiveSteps] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const liveTraceRef = useRef(null);

  const refresh = () => getStatus().then(setStatus).catch(() => {});
  useEffect(() => { refresh(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const patchLast = (patch) =>
    setMessages((m) => {
      const c = [...m];
      const last = c[c.length - 1];
      c[c.length - 1] = typeof patch === "function" ? patch(last) : { ...last, ...patch };
      return c;
    });

  const submit = async (q) => {
    const message = (q ?? input).trim();
    if (!message || loading) return;
    setInput("");
    setLiveSteps([]);
    setMessages((m) => [
      ...m,
      { role: "user", content: message },
      { role: "assistant", answer: "", citations: [], streaming: true },
    ]);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const live = { streaming: true, stageStatus: {}, events: [], tokens: 0 };
    liveTraceRef.current = live;
    setActiveTrace({ ...live });
    setShowTrace(true);
    try {
      const sources = filter === "all" ? ["all"] : [filter];
      await streamChat(message, sources, undefined, (ev) => {
        if (ev.type === "step") {
          setLiveSteps((s) => (s.some((x) => x.agent === ev.agent) ? s : [...s, { agent: ev.agent, label: ev.label }]));
          const stage = AGENT_STAGE[ev.agent];
          const idx = STAGE_ORDER.indexOf(stage);
          STAGE_ORDER.forEach((s, i) => { if (i < idx) live.stageStatus[s] = "done"; });
          if (live.stageStatus[stage] !== "done") live.stageStatus[stage] = "running";
          live.events = [...live.events, { type: "step", agent: ev.agent, label: ev.label, t_ms: ev.t_ms }];
          setActiveTrace({ ...live });
        } else if (ev.type === "tool") {
          live.events = [...live.events, { type: "tool_call", agent: ev.agent, label: ev.label, tool: ev.tool, args: ev.args, t_ms: ev.t_ms }];
          setActiveTrace({ ...live });
        } else if (ev.type === "token") {
          ["orchestrator", "retrieval", "rerank_validation"].forEach((s) => (live.stageStatus[s] = "done"));
          live.stageStatus.response = "streaming";
          live.tokens += 1;
          patchLast((last) => ({ ...last, answer: (last.answer || "") + ev.text }));
          if (live.tokens % 4 === 0) setActiveTrace({ ...live });
        } else if (ev.type === "done") {
          liveTraceRef.current = null;
          setActiveTrace(ev);
          setShowTrace(true);
          patchLast((last) => ({
            ...last, answer: ev.answer, citations: ev.citations,
            insufficient: ev.insufficient, trace: ev, streaming: false,
          }));
        }
      }, controller.signal);
    } catch (e) {
      liveTraceRef.current = null;
      setActiveTrace((t) => (t && t.streaming ? { ...t, streaming: false, stopped: true } : t));
      if (e.name === "AbortError") {
        patchLast((last) => ({
          ...last, streaming: false, stopped: true,
          answer: (last.answer || "") || "_Generation stopped._",
        }));
      } else {
        patchLast({ answer: "Request failed. Check the backend is running.", streaming: false });
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setLiveSteps([]);
    }
  };

  const stopGenerating = () => abortRef.current?.abort();

  const doIngest = async () => {
    setIngesting(true);
    try { await runIngest("all"); await refresh(); } finally { setIngesting(false); }
  };

  const total = status?.total_points ?? "…";

  return (
    <div className="flex h-screen flex-col bg-obsidian bg-grid text-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-subtle bg-obsidian/85 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/10">
            <Boxes size={18} className="text-sky-400" />
          </span>
          <div>
            <h1 className="font-head text-base font-extrabold leading-none tracking-tight">RAG Command Center</h1>
            <p className="text-[11px] text-ink3">Multi-Agent · Google ADK · Qdrant Hybrid</p>
          </div>
        </div>

        <div className="ml-2 flex items-center gap-2">
          <StatBadge icon={Database} label="indexed" value={total} />
          <StatBadge icon={Cpu} label={status?.provider || "llm"} value={status?.model || "…"} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-subtle bg-card text-ink2 transition-colors hover:border-brand/50 hover:text-brand"
            data-testid="theme-toggle-button"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <nav className="flex rounded-lg border border-subtle bg-card p-0.5">
            {["chat", "ingestion"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                  view === v ? "bg-sky-500/15 text-brand" : "text-ink2 hover:text-ink"
                }`}
                data-testid={`nav-${v}`}
              >
                {v}
              </button>
            ))}
          </nav>
          <button
            onClick={() => setShowTrace((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg border border-subtle bg-card px-2.5 py-1.5 text-xs text-ink2 hover:border-sky-500/40"
            data-testid="agent-trace-toggle-button"
          >
            {showTrace ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            <span className="hidden sm:inline">Trace</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          {view === "chat" ? (
            <>
              {/* filters */}
              <div className="flex flex-wrap items-center gap-2 border-b border-subtle px-4 py-2.5">
                <span className="text-[11px] uppercase tracking-wide text-ink3">Scope</span>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      filter === f.key
                        ? "border-sky-500/50 bg-sky-500/15 text-brand"
                        : "border-subtle bg-card text-ink2 hover:text-ink"
                    }`}
                    data-testid={`source-filter-${f.key}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* thread */}
              <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 py-5 lg:px-8">
                {messages.length === 0 && (
                  <div className="mx-auto max-w-2xl pt-6 text-center">
                    <h2 className="font-head text-2xl font-bold tracking-tight text-ink">Ask your knowledge base</h2>
                    <p className="mt-1.5 text-sm text-ink3">
                      Grounded answers with citations across Confluence, Word docs and ServiceNow — with a full agent trace.
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      {(status?.samples || []).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => submit(s)}
                          className="rounded-xl border border-subtle bg-card px-4 py-2.5 text-left text-sm text-ink2 transition-colors hover:border-sky-500/40 hover:bg-cardhover"
                          data-testid={`sample-query-${i}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="fade-up flex justify-end" data-testid="user-message">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-ink">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <AssistantMessage
                      key={i}
                      msg={m}
                      liveSteps={m.streaming ? liveSteps : null}
                      onTrace={(t) => { setActiveTrace(t); setShowTrace(true); }}
                    />
                  )
                )}
                <div ref={endRef} />
              </div>

              {/* input */}
              <div className="border-t border-subtle bg-obsidian/70 px-4 py-3 lg:px-8">
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                    rows={1}
                    placeholder="Ask about a policy, runbook, or past incident…"
                    className="scroll-thin max-h-32 flex-1 resize-none rounded-xl border border-subtle bg-card px-4 py-3 text-sm text-ink placeholder-ink3 outline-none focus:border-sky-500/50"
                    data-testid="chat-input-textarea"
                  />
                  {loading ? (
                    <button
                      onClick={stopGenerating}
                      className="flex h-[46px] items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                      data-testid="chat-stop-button"
                    >
                      <Square size={14} className="fill-current" />
                      <span className="hidden sm:inline">Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => submit()}
                      disabled={!input.trim()}
                      className="flex h-[46px] items-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-obsidian transition-colors hover:bg-sky-400 disabled:opacity-40"
                      data-testid="chat-submit-button"
                    >
                      <Send size={16} />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <IngestionView status={status} onIngest={doIngest} ingesting={ingesting} onRefresh={refresh} />
          )}
        </main>

        {/* Trace panel */}
        {showTrace && (
          <aside className="hidden w-[420px] shrink-0 border-l border-subtle bg-slatebg/95 backdrop-blur-xl lg:block">
            <TracePanel trace={activeTrace} onClose={() => setShowTrace(false)} />
          </aside>
        )}
      </div>
    </div>
  );
}

function IngestionView({ status, onIngest, ingesting, onRefresh }) {
  const sources = status?.sources || {};
  return (
    <div className="scroll-thin flex-1 overflow-y-auto p-6 lg:p-10" data-testid="ingestion-status-dashboard">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-head text-2xl font-bold tracking-tight">Ingestion Dashboard</h2>
            <p className="text-sm text-ink3">Unified pipeline · idempotent connectors · Qdrant hybrid index</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink2 hover:border-sky-500/40" data-testid="refresh-status-button">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={onIngest} disabled={ingesting} className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-obsidian hover:bg-sky-400 disabled:opacity-50" data-testid="run-ingest-button">
              {ingesting ? <Loader2 size={15} className="animate-spin" /> : <Wrench size={15} />} Re-run Ingestion
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Chunks", value: status?.total_points ?? "…" },
            { label: "Index Type", value: "Hybrid" },
            { label: "Provider", value: status?.provider ?? "…" },
            { label: "Model", value: status?.model ?? "…" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-subtle bg-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-ink3">{s.label}</div>
              <div className="mt-1 font-mono text-xl font-bold text-ink">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Object.entries(sources).map(([key, s]) => (
            <div key={key} className="rounded-xl border border-subtle bg-card p-5" data-testid={`source-card-${key}`}>
              <div className="mb-3 flex items-center justify-between">
                <SourceBadge type={key} />
                <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <div className="font-head text-lg font-semibold text-ink">{s.label}</div>
              <div className="mt-3 flex items-end gap-4">
                <div>
                  <div className="font-mono text-2xl font-bold text-sky-400">{s.documents}</div>
                  <div className="text-[11px] text-ink3">documents</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-bold text-ink">{s.chunks}</div>
                  <div className="text-[11px] text-ink3">chunks</div>
                </div>
              </div>
              <div className="mt-3 truncate text-[11px] text-ink3">
                last: {s.last_indexed ? new Date(s.last_indexed).toLocaleString() : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
