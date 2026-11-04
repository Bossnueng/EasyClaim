import { io } from "socket.io-client";

const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

// ตัด /api หรือ / ข้างหลังออก เพื่อให้ได้เฉพาะ Server Host
const SOCKET_URL = rawUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

const serverUrl = new URL(SOCKET_URL || "/", window.location.origin);
const SOCKET_ORIGIN = serverUrl.origin;
const SOCKET_PATH = `${serverUrl.pathname.replace(/\/+$/, "")}/socket.io`;

const socket = io(SOCKET_ORIGIN, {
  path: SOCKET_PATH,
  autoConnect: true,
  transports: ["websocket"],
});

export default socket;
