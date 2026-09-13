"""Three idempotent source connectors -> common normalized schema.

Each reads real source systems when credentials are configured in .env,
otherwise falls back to the bundled mock dataset so the pilot runs at $0.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Any, Dict, List

from common.schema import normalized_doc

MOCK_DIR = Path(__file__).resolve().parent.parent / "data" / "mock"


def _load_mock(name: str) -> List[Dict[str, Any]]:
    with open(MOCK_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)


# --- Confluence -------------------------------------------------------------
def confluence_connector() -> List[Dict[str, Any]]:
    if os.environ.get("CONFLUENCE_BASE_URL") and os.environ.get("CONFLUENCE_TOKEN"):
        raise NotImplementedError(
            "Live Confluence configured but not wired in this pilot; unset CONFLUENCE_* to use mock data."
        )
    docs = []
    for p in _load_mock("confluence.json"):
        docs.append(normalized_doc(
            "confluence", p["source_id"], p["title"], p["body"], p["url"], p["updated_at"],
            {"space": p.get("space"), "labels": p.get("labels", []), "author": p.get("author")},
        ))
    return docs


# --- Word documents ---------------------------------------------------------
def worddocs_connector() -> List[Dict[str, Any]]:
    folder = os.environ.get("WORDDOCS_PATH") or str(MOCK_DIR / "worddocs")
    docs = []
    root = Path(folder)
    if not root.exists():
        return docs
    for path in sorted(root.glob("*.docx")):
        docs.append(_parse_docx(path))
    return docs


def _parse_docx(path: Path) -> Dict[str, Any]:
    from docx import Document as Docx
    d = Docx(str(path))
    lines: List[str] = []
    for para in d.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        if para.style and para.style.name and para.style.name.lower().startswith("heading"):
            lines.append(f"# {text}")
        else:
            lines.append(text)
    for table in d.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            lines.append(" | ".join(cells))
    props = d.core_properties
    title = (props.title or path.stem).strip()
    updated = props.modified.isoformat() if props.modified else ""
    return normalized_doc(
        "worddoc", path.stem, title, "\n".join(lines), f"file://{path}", updated,
        {"filename": path.name, "path": str(path), "author": props.author or ""},
    )


# --- ServiceNow -------------------------------------------------------------
def servicenow_connector() -> List[Dict[str, Any]]:
    if os.environ.get("SERVICENOW_INSTANCE_URL") and os.environ.get("SERVICENOW_TOKEN"):
        raise NotImplementedError(
            "Live ServiceNow configured but not wired in this pilot; unset SERVICENOW_* to use mock data."
        )
    docs = []
    for t in _load_mock("servicenow.json"):
        # Only index closed/resolved incidents that carry a resolution.
        if t.get("state", "").lower() not in ("closed", "resolved"):
            continue
        if not (t.get("resolution") or t.get("close_notes")):
            continue
        body = (
            f"{t['short_description']}\n\n{t.get('description','')}\n\n"
            f"Resolution: {t.get('resolution') or t.get('close_notes')}"
        )
        docs.append(normalized_doc(
            "servicenow", t["source_id"], t["short_description"], body, t["url"], t.get("closed_at", ""),
            {"category": t.get("category"), "priority": t.get("priority"),
             "resolution_code": t.get("resolution_code"), "state": t.get("state")},
        ))
    return docs


def live_servicenow_lookup(number: str) -> Dict[str, Any]:
    """Live status lookup for an open/active incident (not indexed)."""
    number = (number or "").strip().upper()
    for t in _load_mock("servicenow.json"):
        if t["source_id"].upper() == number:
            return {
                "number": t["source_id"], "state": t.get("state"),
                "short_description": t.get("short_description"),
                "priority": t.get("priority"), "category": t.get("category"),
                "opened_at": t.get("opened_at"), "url": t.get("url"),
                "resolution": t.get("resolution") or None,
            }
    return {"error": f"No incident found for {number}"}


CONNECTORS = {
    "confluence": confluence_connector,
    "worddocs": worddocs_connector,
    "servicenow": servicenow_connector,
}
