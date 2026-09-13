import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api` });

export const getStatus = () => api.get("/status").then((r) => r.data);
export const runIngest = (source = "all") => api.post("/ingest", { source }).then((r) => r.data);

// Streaming chat over SSE (fetch + ReadableStream, since EventSource can't POST).
export async function streamChat(message, sources, session_id, onEvent) {
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sources, session_id }),
  });
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    buf = buf.replace(/\r\n/g, "\n");
    const frames = buf.split("\n\n");
    buf = frames.pop();
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try { onEvent(JSON.parse(line.slice(5).trim())); } catch (e) { /* skip */ }
    }
  }
}

export default api;
