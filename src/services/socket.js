import { io } from "socket.io-client";

const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

// ตัด /api หรือ / ข้างหลังออก เพื่อให้ได้เฉพาะ Server Host
const SOCKET_URL = rawUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket"],
});

export default socket;