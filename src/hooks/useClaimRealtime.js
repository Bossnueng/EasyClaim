// src/hooks/useClaimRealtime.js
import { useEffect } from "react";
import socket from "../services/socket";

export const useClaimRealtime = ({ claimId, isStaff, userId, onCreated, onStatusUpdated, onCommentCreated }) => {
  useEffect(() => {
    // 🟢 เข้าร่วม Room ส่วนตัวของ User (เพื่อรับ notification ฝั่งตัวเอง)
    if (userId) {
      socket.emit("join:user", userId); // หรือส่ง userId เข้า room เช่น room:user_123
    }

    // เข้าร่วม Room ฝั่ง Staff / Claim
    if (isStaff) {
      socket.emit("join:staff");
    }
    if (claimId) {
      socket.emit("join:claim", claimId);
    }

    // ดักฟัง Events เดิม
    if (onCreated) socket.on("claim:created", onCreated);
    if (onStatusUpdated) socket.on("claim:status_updated", onStatusUpdated);
    if (onCommentCreated) socket.on("claim:comment_created", onCommentCreated);

    // 🟢 ดักฟัง Event เมื่อ Admin มีการอัปเดตสังกัด/สิทธิ์ของ User คนนี้
    const handleUserUpdated = (data) => {
      alert("ข้อมูลสังกัดของคุณถูกอัปเดต กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    };

    socket.on("user:updated", handleUserUpdated);

    // Cleanup listeners
    return () => {
      if (onCreated) socket.off("claim:created", onCreated);
      if (onStatusUpdated) socket.off("claim:status_updated", onStatusUpdated);
      if (onCommentCreated) socket.off("claim:comment_created", onCommentCreated);
      socket.off("user:updated", handleUserUpdated);
    };
  }, [claimId, isStaff, userId, onCreated, onStatusUpdated, onCommentCreated]);
};