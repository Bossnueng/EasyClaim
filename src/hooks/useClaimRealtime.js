// src/hooks/useClaimRealtime.js
import { useEffect, useRef } from "react";
import socket from "../services/socket";

export const useClaimRealtime = ({ claimId, claimIds, isStaff, userId, onCreated, onStatusUpdated, onCommentCreated }) => {
  // 🟢 ใช้ useRef เพื่อเก็บ callback ล่าสุด ป้องกันปัญหา Listener หลุดเวลา Re-render
  const callbacksRef = useRef({ onCreated, onStatusUpdated, onCommentCreated });

  useEffect(() => {
    callbacksRef.current = { onCreated, onStatusUpdated, onCommentCreated };
  });

  const roomKey = [claimId, ...(Array.isArray(claimIds) ? claimIds : [])]
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => String(v).trim())
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .sort()
    .join(",");

  useEffect(() => {
    const rooms = roomKey ? roomKey.split(",") : [];
    const roomSet = new Set(rooms);
    const isForThisPage = (data) => roomSet.size === 0 || roomSet.has(String(data?.claim_id ?? "").trim());

    const joinRooms = () => {
      if (userId) socket.emit("join:user", userId);
      if (isStaff) socket.emit("join:staff");
      rooms.forEach((id) => socket.emit("join:claim", id));
    };
    joinRooms();
    socket.on("connect", joinRooms);

    const handleCreated = (data) => callbacksRef.current.onCreated?.(data);
    const handleStatusUpdated = (data) => {
      if (isForThisPage(data)) callbacksRef.current.onStatusUpdated?.(data);
    };
    const handleCommentCreated = (data) => {
      if (isForThisPage(data)) callbacksRef.current.onCommentCreated?.(data);
    };

    socket.on("claim:created", handleCreated);
    socket.on("claim:status_updated", handleStatusUpdated);
    socket.on("claim:comment_created", handleCommentCreated);

    const handleUserUpdated = (data) => {
      if (!userId || String(data?.user_id ?? "") !== String(userId)) return;
      alert("ข้อมูลสังกัดของคุณถูกอัปเดต กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    };

    socket.on("user:updated", handleUserUpdated);

    return () => {
      socket.off("connect", joinRooms);
      socket.off("claim:created", handleCreated);
      socket.off("claim:status_updated", handleStatusUpdated);
      socket.off("claim:comment_created", handleCommentCreated);
      socket.off("user:updated", handleUserUpdated);
    };
  }, [roomKey, isStaff, userId]);
};

export const isStatusChangeEvent = (log) => Boolean(log) && !String(log.remark || "").startsWith("[MSG]");
