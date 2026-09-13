import React from "react";

export const SOURCE_STYLE = {
  confluence: { label: "Confluence", cls: "bg-blue-900/40 text-blue-300 border-blue-700/50" },
  worddoc: { label: "Word Doc", cls: "bg-cyan-900/40 text-cyan-300 border-cyan-700/50" },
  servicenow: { label: "ServiceNow", cls: "bg-amber-900/40 text-amber-300 border-amber-700/50" },
};

export const AGENT_STYLE = {
  orchestrator: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  document_agent: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  incident_agent: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
  search_agent: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  rerank_validate: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  response_agent: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
};

export function SourceBadge({ type }) {
  const s = SOURCE_STYLE[type] || { label: type, cls: "bg-slate-700/40 text-slate-300 border-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
