// src/hooks/useClaimRealtime.js
import { useEffect, useRef } from "react";
import socket from "../services/socket";

export const useClaimRealtime = ({ claimId, isStaff, userId, onCreated, onStatusUpdated, onCommentCreated }) => {
  // 🟢 ใช้ useRef เพื่อเก็บ callback ล่าสุด ป้องกันปัญหา Listener หลุดเวลา Re-render
  const callbacksRef = useRef({ onCreated, onStatusUpdated, onCommentCreated });

  useEffect(() => {
    callbacksRef.current = { onCreated, onStatusUpdated, onCommentCreated };
  });

  useEffect(() => {
    if (userId) {
      socket.emit("join:user", userId);
    }
    if (isStaff) {
      socket.emit("join:staff");
    }
    if (claimId) {
      socket.emit("join:claim", claimId);
    }

    const handleCreated = (data) => callbacksRef.current.onCreated?.(data);
    const handleStatusUpdated = (data) => callbacksRef.current.onStatusUpdated?.(data);
    const handleCommentCreated = (data) => callbacksRef.current.onCommentCreated?.(data);

    socket.on("claim:created", handleCreated);
    socket.on("claim:status_updated", handleStatusUpdated);
    socket.on("claim:comment_created", handleCommentCreated);

    const handleUserUpdated = (data) => {
      alert("ข้อมูลสังกัดของคุณถูกอัปเดต กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    };

    socket.on("user:updated", handleUserUpdated);

    return () => {
      socket.off("claim:created", handleCreated);
      socket.off("claim:status_updated", handleStatusUpdated);
      socket.off("claim:comment_created", handleCommentCreated);
      socket.off("user:updated", handleUserUpdated);
    };
  }, [claimId, isStaff, userId]);
};