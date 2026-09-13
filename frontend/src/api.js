import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api` });

export const getStatus = () => api.get("/status").then((r) => r.data);
export const runIngest = (source = "all") => api.post("/ingest", { source }).then((r) => r.data);
export const sendChat = (message, sources, session_id) =>
  api.post("/chat", { message, sources, session_id }).then((r) => r.data);

export default api;
