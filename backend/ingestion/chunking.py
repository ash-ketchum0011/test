"""Parsing / normalizing / chunking / metadata. No LLM calls (fast + free to test)."""
from __future__ import annotations
import re
from typing import Any, Dict, List

TARGET_WORDS = int(400 * 0.75)  # ~400 tokens
OVERLAP_WORDS = int(TARGET_WORDS * 0.15)


def _blocks(body: str):
    """Yield (section_heading, paragraph) preserving heading structure."""
    heading = ""
    for raw in body.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            heading = line.lstrip("#").strip()
            continue
        line = re.sub(r"\s+", " ", line)
        yield heading, line


def chunk_document(doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    cur_words: List[str] = []
    cur_heading = ""

    def flush():
        nonlocal cur_words
        if not cur_words:
            return
        text = " ".join(cur_words)
        idx = len(chunks)
        chunks.append({
            "chunk_id": f"{doc['id']}#{idx}",
            "text": f"{doc['title']}. {text}" if idx == 0 else text,
            "payload": {
                "source_type": doc["source_type"],
                "source_id": doc["source_id"],
                "title": doc["title"],
                "url": doc["url"],
                "section_heading": cur_heading,
                "updated_at": doc["updated_at"],
                "priority": doc["metadata"].get("priority"),
                "resolution_code": doc["metadata"].get("resolution_code"),
                "chunk_id": f"{doc['id']}#{idx}",
            },
        })
        cur_words = cur_words[-OVERLAP_WORDS:] if OVERLAP_WORDS else []

    for heading, para in _blocks(doc["body"]):
        if heading != cur_heading and cur_words:
            flush()
            cur_words = []
        cur_heading = heading
        for word in para.split(" "):
            cur_words.append(word)
            if len(cur_words) >= TARGET_WORDS:
                flush()
    flush()
    for c in chunks:
        c["payload"]["text"] = c["text"]
    return chunks
