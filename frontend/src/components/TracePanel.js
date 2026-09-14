import React, { useState } from "react";
import {
  Workflow, ChevronDown, ChevronRight, Wrench, MessageSquare,
  Layers, ShieldCheck, Sparkles, Clock, X, Loader2, Check, Circle,
} from "lucide-react";
import { SourceBadge, AGENT_STYLE } from "./badges";

const AGENT_STAGE = {
  orchestrator: "orchestrator", document_agent: "retrieval", incident_agent: "retrieval",
  search_agent: "retrieval", rerank_validate: "rerank_validation", response_agent: "response",
};

const PIPELINE = [
  { key: "orchestrator", label: "Orchestrator", icon: Sparkles, desc: "Classify & rewrite query" },
  { key: "retrieval", label: "Parallel Specialists", icon: Layers, desc: "Document · Incident · Search" },
  { key: "rerank_validation", label: "Re-rank / Validate", icon: ShieldCheck, desc: "Cross-encoder + groundedness" },
  { key: "response", label: "Response", icon: MessageSquare, desc: "Grounded answer + citations" },
];

function Score({ label, value, color }) {
  if (value === null || value === undefined) return null;
  return (
    <span className={`font-mono text-[10px] ${color}`} title={label}>
      {label}:{typeof value === "number" ? value.toFixed(3) : value}
    </span>
  );
}

function ChunkRow({ c }) {
  return (
    <div className="rounded-lg border border-subtle bg-obsidian/60 p-2.5" data-testid="trace-chunk">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-ink">{c.title}</span>
        <SourceBadge type={c.source_type} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <Score label="rrf" value={c.score} color="text-sky-400" />
        <Score label="dense" value={c.dense_score} color="text-blue-400" />
        <Score label="sparse" value={c.sparse_score} color="text-purple-400" />
        <Score label="rerank" value={c.rerank_score} color="text-emerald-400" />
      </div>
      {c.snippet && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink3">{c.snippet}</p>}
    </div>
  );
}

function Stage({ stage, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = PIPELINE.find((p) => p.key === stage.stage) || {};
  const Icon = meta.icon || Workflow;
  const d = stage.detail || {};

  return (
    <div className="rounded-xl border border-subtle bg-card" data-testid={`trace-stage-${stage.stage}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
        data-testid={`trace-stage-toggle-${stage.stage}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-subtle bg-obsidian">
          <Icon size={15} className="text-sky-400" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{stage.label}</span>
          <span className="block text-[11px] text-ink3">{meta.desc}</span>
        </span>
        {open ? <ChevronDown size={16} className="text-ink3" /> : <ChevronRight size={16} className="text-ink3" />}
      </button>

      {open && (
        <div className="space-y-2 border-t border-subtle px-3.5 py-3">
          {stage.stage === "orchestrator" && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-amber-500/80">Rewritten Query</div>
              <p className="font-mono text-xs text-amber-200">{d.rewritten_query || "—"}</p>
            </div>
          )}

          {stage.stage === "retrieval" &&
            ["document_agent", "incident_agent", "search_agent"].map((k) => (
              <div key={k}>
                <div className={`mb-1 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${AGENT_STYLE[k]}`}>
                  {k.replace("_", " ")} · {(d[k] || []).length} hits
                </div>
                <div className="space-y-1.5">
                  {(d[k] || []).slice(0, 4).map((c, i) => <ChunkRow key={i} c={c} />)}
                </div>
              </div>
            ))}

          {stage.stage === "retrieval" && d.live_lookup && (
            <div className="rounded-lg border border-amber-600/30 bg-amber-900/10 p-2.5 text-xs text-amber-200">
              <div className="mb-0.5 font-semibold">Live ticket lookup</div>
              <span className="font-mono">{d.live_lookup.number} · {d.live_lookup.state}</span>
            </div>
          )}

          {stage.stage === "rerank_validation" && (
            <>
              <div className="flex items-center gap-3 text-[11px] text-ink2">
                <span>merged: <b className="text-ink">{d.merged_count ?? 0}</b></span>
                <span>kept: <b className="text-ink">{(d.survivors || []).length}</b></span>
                <span className={d.insufficient ? "text-red-400" : "text-emerald-400"}>
                  {d.insufficient ? "insufficient evidence" : "grounded ✓"}
                </span>
              </div>
              <div className="space-y-1.5">
                {(d.survivors || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-subtle bg-obsidian/60 px-2.5 py-1.5">
                    <span className="mr-2 flex items-center gap-2 truncate text-xs text-ink">
                      <span className="font-mono text-emerald-400">#{i + 1}</span> {c.title}
                    </span>
                    <span className="flex items-center gap-2">
                      <SourceBadge type={c.source_type} />
                      <span className="font-mono text-[10px] text-emerald-400">{Number(c.rerank_score).toFixed(2)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {stage.stage === "response" && (
            <div className="flex items-center gap-4 text-[11px] text-ink2">
              <span className={d.grounded ? "text-emerald-400" : "text-red-400"}>
                {d.grounded ? "Grounded answer" : "Ungrounded / flagged"}
              </span>
              <span>{d.citations} citations</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ st }) {
  if (st === "done") return <Check size={16} className="text-emerald-400" />;
  if (st === "running") return <Loader2 size={15} className="animate-spin text-sky-400" />;
  if (st === "streaming")
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-brand">
        <span className="live-dot h-2 w-2 rounded-full bg-sky-400" /> streaming
      </span>
    );
  return <Circle size={13} className="text-ink3" />;
}

function LivePipeline({ trace }) {
  const status = trace.stageStatus || {};
  return (
    <div className="space-y-2.5" data-testid="live-pipeline">
      {PIPELINE.map((p) => {
        const st = status[p.key] || "pending";
        const Icon = p.icon;
        const tools = (trace.events || []).filter((e) => e.type === "tool_call" && AGENT_STAGE[e.agent] === p.key);
        return (
          <div
            key={p.key}
            className={`rounded-xl border bg-card p-3 transition-all duration-300 ${st === "pending" ? "border-subtle opacity-45" : "border-brand/40"}`}
            data-testid={`live-stage-${p.key}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-subtle bg-obsidian">
                <Icon size={15} className="text-sky-400" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">{p.label}</span>
                <span className="block text-[11px] text-ink3">{p.desc}</span>
              </span>
              <StatusIndicator st={st} />
            </div>
            {tools.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-subtle pt-2">
                {tools.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-ink2">
                    <Wrench size={10} /> {e.tool}
                    {e.args?.query ? `("${String(e.args.query).slice(0, 32)}…")` : e.args?.number ? `(${e.args.number})` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TracePanel({ trace, onClose }) {
  const [tab, setTab] = useState("pipeline");
  if (!trace) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-ink3">
        <Workflow size={40} className="opacity-40" />
        <p className="text-sm">Ask a question to see the live agent trace — every step, tool call and retrieved chunk.</p>
      </div>
    );
  }
  if (trace.streaming) {
    return (
      <div className="flex h-full flex-col" data-testid="agent-trace-panel">
        <div className="flex items-center gap-2 border-b border-subtle px-4 py-3">
          <span className="live-dot h-2 w-2 rounded-full bg-sky-400" />
          <h3 className="font-head text-sm font-bold tracking-tight text-ink">Agent Trace</h3>
          <span className="font-mono text-[11px] text-brand">running…</span>
          {onClose && (
            <button onClick={onClose} className="ml-auto rounded-md p-1 text-ink3 hover:bg-cardhover hover:text-ink" data-testid="trace-close-button">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto p-3">
          <LivePipeline trace={trace} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col" data-testid="agent-trace-panel">
      <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
          <h3 className="font-head text-sm font-bold tracking-tight text-ink">Agent Trace</h3>
          <span className="flex items-center gap-1 font-mono text-[11px] text-ink3">
            <Clock size={11} /> {trace.elapsed_ms} ms
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-ink3 hover:bg-cardhover hover:text-ink" data-testid="trace-close-button">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-subtle px-3 py-2">
        {["pipeline", "events"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${
              tab === t ? "bg-sky-500/15 text-brand" : "text-ink3 hover:text-ink2"
            }`}
            data-testid={`trace-tab-${t}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="scroll-thin flex-1 space-y-2.5 overflow-y-auto p-3">
        {tab === "pipeline" &&
          (trace.stages || []).map((s, i) => (
            <Stage key={s.stage} stage={s} defaultOpen={s.stage === "orchestrator" || s.stage === "rerank_validation"} />
          ))}

        {tab === "events" &&
          (trace.events || []).map((e, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-subtle bg-card px-3 py-2" data-testid="trace-event">
              <span className="font-mono text-[10px] text-ink3 pt-0.5">{String(e.t_ms).padStart(5, " ")}ms</span>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${AGENT_STYLE[e.agent] || "border-subtle text-ink2"}`}>
                {e.label}
              </span>
              <span className="min-w-0 flex-1 text-[11px] text-ink2">
                {e.type === "tool_call" && (
                  <span className="flex items-center gap-1 text-ink2"><Wrench size={11} /> {e.tool}({e.args?.query ? `"${String(e.args.query).slice(0, 40)}…"` : e.args?.number || ""})</span>
                )}
                {e.type === "tool_response" && <span className="text-emerald-400/80">→ {e.count} results</span>}
                {e.type === "message" && <span className="line-clamp-3">{e.text}</span>}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
