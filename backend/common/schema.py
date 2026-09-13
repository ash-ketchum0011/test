"""Common normalized schema shared by every connector."""
from __future__ import annotations
import hashlib
from typing import Any, Dict, List


def normalized_doc(source_type: str, source_id: str, title: str, body: str,
                   url: str, updated_at: str, metadata: Dict[str, Any] | None = None) -> Dict[str, Any]:
    return {
        "id": f"{source_type}:{source_id}",
        "source_type": source_type,
        "source_id": source_id,
        "title": title,
        "body": body,
        "url": url,
        "updated_at": updated_at,
        "metadata": metadata or {},
    }


def content_hash(doc: Dict[str, Any]) -> str:
    h = hashlib.sha256()
    h.update((doc.get("title", "") + "\n" + doc.get("body", "")).encode("utf-8"))
    return h.hexdigest()
