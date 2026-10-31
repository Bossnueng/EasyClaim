// src/hooks/useClaimRealtime.js
import { useEffect, useRef } from "react";
import socket from "../services/socket";

/**
 * [QA-FIX 2026-10-31] Test Case 3.1 / 3.2
 * - เพิ่ม `claimIds` (อาร์เรย์) เพื่อ join ห้อง `claim:<id>` ของทุกเคลมที่หน้าจอแสดงอยู่ (หน้า Home / List)
 *   เพราะ backend ไม่ส่ง "claim:status_updated" / "claim:created" เลย แต่ทุกการเปลี่ยนสถานะจะสร้าง Log
 *   และส่ง "claim:comment_created" เข้าห้องของเคลมนั้น → หน้า List/Home รับรู้ได้ทันทีโดยไม่ต้องรอ polling
 * - socket เป็นตัวเดียวทั้งแอป และห้องที่ join แล้วไม่ถูกออก → กรอง event ให้ตรงกับเคลมของหน้านี้เท่านั้น
 *   (กันหน้า Detail ใบหนึ่งได้รับแชทของอีกใบที่เคย join จากหน้า List)
 * - join ห้องซ้ำทุกครั้งที่ socket reconnect (เดิม join ครั้งเดียว ถ้าเน็ตหลุดแล้วต่อใหม่จะไม่ได้รับ event อีก)
 * - "user:updated" เดิม logout ทุกคนที่ออนไลน์ → ตรวจ user_id ก่อน (เฉพาะคนที่ถูกแก้สังกัด)
 */
export const useClaimRealtime = ({ claimId, claimIds, isStaff, userId, onCreated, onStatusUpdated, onCommentCreated }) => {
  // 🟢 ใช้ useRef เพื่อเก็บ callback ล่าสุด ป้องกันปัญหา Listener หลุดเวลา Re-render
  const callbacksRef = useRef({ onCreated, onStatusUpdated, onCommentCreated });

  useEffect(() => {
    callbacksRef.current = { onCreated, onStatusUpdated, onCommentCreated };
  });

  // รวมเลขเคลมเป็น string คงที่ เพื่อใช้เป็น dependency (อาร์เรย์ใหม่ทุก render จะไม่ทำให้ join ซ้ำ)
  const roomKey = [claimId, ...(Array.isArray(claimIds) ? claimIds : [])]
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => String(v).trim())
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .sort()
    .join(",");

  useEffect(() => {
    const rooms = roomKey ? roomKey.split(",") : [];
    const roomSet = new Set(rooms);
    // ไม่ได้ระบุเคลมเลย (เช่น StaffHome ที่ฟังภาพรวม) → รับทุก event เหมือนเดิม
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
      // [QA-FIX 2026-10-31] เดิมไม่ตรวจว่าเป็นของใคร → ทุกคนที่ออนไลน์ถูก logout
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

/** [QA-FIX 2026-10-31] Log ที่ไม่ใช่ข้อความแชท ([MSG]) = มีการเปลี่ยนสถานะ/ข้อมูล → ควรรีเฟรชรายการ */
export const isStatusChangeEvent = (log) => Boolean(log) && !String(log.remark || "").startsWith("[MSG]");
