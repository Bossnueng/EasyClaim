// src/utils/claimFlow.js
// [FLOW-FIX 2026-10-31] ตัวช่วยกลางสำหรับ "ลำดับสถานะเคลม / Stamp เวลา / ไทม์ไลน์" ใช้ร่วมกันทั้งฝั่ง Staff และ Customer
// เดิมแต่ละหน้าคำนวณเองและมีปัญหา:
//   - เวลา Stamp ของแต่ละสถานะถูกทับด้วย Log ข้อความแชท [MSG] / Log มอบหมาย พขร. / Log ลูกค้ากดยืนยัน
//     (เพราะ Log เหล่านี้บันทึก status = สถานะปัจจุบันไปด้วย)
//   - ไทม์ไลน์ดู "เคยมี Log" แทนสถานะปัจจุบัน → ถอยสถานะแล้วไทม์ไลน์ไม่ถอยตาม / เคย Rejected แล้วแดงตลอด
//   - Log จาก API ไม่ได้เรียงลำดับ (SQL ไม่มี ORDER BY) แต่โค้ดเดิมหยิบตัวสุดท้ายเป็น "ล่าสุด"

import { getStatusName } from "../constants/claimStatus";

// Log ที่ "ไม่ใช่การเปลี่ยนสถานะ" (เป็นบันทึกเสริม) — ห้ามใช้เป็นเวลา Stamp ของสถานะ
const NOTE_LOG_PATTERNS = [
  "[MSG]",
  "มอบหมายงาน พขร.",
  "ลูกค้ากดยืนยันการส่งเคลม",
  "ลูกค้ายืนยันรับสินค้า",
  // [DOC-FIX 2026-10-31] Log ยืนยันอัตโนมัติ
  "ระบบยืนยันการส่งเคลมอัตโนมัติ",
  "ระบบยืนยันรับสินค้าอัตโนมัติ",
];

const REVERT_LOG_PATTERN = "ถอยสถานะ";

export const STEP_INDEX = {
  Pending: 0,
  Approved: 1,
  Rejected: 1,
  Processing: 2,
  Shipping: 3,
  Delivered: 4,
};

const logTime = (log) => {
  const d = new Date(log?.update_date || log?.created_at || log?.created_date || 0).getTime();
  return Number.isFinite(d) ? d : 0;
};

/** เรียง Log เก่า → ใหม่ (ตาม log_id แล้วตามเวลา) */
export const sortLogs = (logs = []) =>
  (Array.isArray(logs) ? [...logs] : []).sort((a, b) => {
    const idA = Number(a?.log_id);
    const idB = Number(b?.log_id);
    if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) return idA - idB;
    return logTime(a) - logTime(b);
  });

export const isNoteLog = (log) => {
  const remark = String(log?.remark || "");
  return NOTE_LOG_PATTERNS.some((p) => remark.includes(p));
};

const isRevertLog = (log) => String(log?.remark || "").includes(REVERT_LOG_PATTERN);

/** Log ที่เป็นการเปลี่ยนสถานะจริง (ตัด Log แชท/มอบหมาย/ลูกค้ายืนยัน ออก) เรียงเก่า → ใหม่ */
export const getStatusChangeLogs = (logs = []) => sortLogs(logs).filter((l) => !isNoteLog(l));

/**
 * เวลา Stamp ล่าสุดของสถานะที่กำหนด (ไม่นับ Log ถอยสถานะ เพื่อให้เวลาเดิมของสถานะไม่ถูกทับ)
 * @returns {string|Date|null}
 */
export const getStatusStampDate = (logs = [], statusIds = []) => {
  const ids = statusIds.map(String);
  const matched = getStatusChangeLogs(logs).filter(
    (l) => ids.includes(String(l.status ?? l.status_id)) && !isRevertLog(l)
  );
  const last = matched[matched.length - 1];
  return last ? last.update_date || last.created_at || last.created_date || null : null;
};

/** ผลการพิจารณาล่าสุด: "Approved" | "Rejected" | null */
export const getLatestDecision = (logs = []) => {
  const decisions = getStatusChangeLogs(logs).filter((l) => ["6", "7"].includes(String(l.status ?? l.status_id)));
  const last = decisions[decisions.length - 1];
  if (!last) return null;
  return String(last.status ?? last.status_id) === "7" ? "Rejected" : "Approved";
};

/** แปลงค่าสถานะจาก DB (ตัวเลข/ชื่อไทย/ชื่ออังกฤษ) เป็นชื่อมาตรฐาน */
export const normalizeStatus = (rawStatus) => getStatusName(String(rawStatus ?? "").trim() || "5");

/** ขั้นของไทม์ไลน์ 0–4 ตาม "สถานะปัจจุบัน" เท่านั้น */
export const getStepIndex = (statusName) => STEP_INDEX[statusName] ?? 0;

/**
 * อยู่ในเส้นทาง "ไม่อนุมัติ" หรือไม่ (สถานะ Rejected หรือ Shipping/Delivered ที่มาจากการ Rejected)
 * ใช้เปลี่ยนสีไทม์ไลน์เป็นสีแดง และข้ามขั้น Processing
 */
export const isRejectedFlow = (statusName, logs = []) => {
  if (statusName === "Rejected") return true;
  if (["Shipping", "Delivered"].includes(statusName)) return getLatestDecision(logs) === "Rejected";
  return false;
};

/** รายการจัดส่ง (Delivery) ของเคลมนี้ที่สถานะ = 8 คือ "มอบหมาย พขร. แล้ว" (ใหม่ → เก่า) */
export const getDriverAssignments = (deliveries = [], claimId) =>
  (Array.isArray(deliveries) ? deliveries : [])
    .filter((d) => String(d.claim_id) === String(claimId) && String(d.delivery_status) === "8")
    .sort((a, b) => Number(b.delivery_id || 0) - Number(a.delivery_id || 0));

/** หา Delivery ตามสถานะ (เช่น 9 = Shipping, 10 = Delivered) ที่ พขร. อัปเดตจากอีกแพลตฟอร์ม */
export const getDeliveryDateByStatus = (deliveries = [], claimId, statusId) => {
  const rows = (Array.isArray(deliveries) ? deliveries : [])
    .filter((d) => String(d.claim_id) === String(claimId) && String(d.delivery_status) === String(statusId))
    .sort((a, b) => Number(b.delivery_id || 0) - Number(a.delivery_id || 0));
  return rows[0]?.receive_date || rows[0]?.created_at || null;
};

/**
 * ต้องมอบหมาย พขร. ก่อน Shipping หรือไม่
 * - Processing (อนุมัติ → เปลี่ยนสินค้าแล้ว รอส่งคืน) หรือ Rejected (ไม่อนุมัติ รอส่งคืนสินค้า)
 * - และยังไม่มีรายการ Delivery สถานะ 8 ของเคลมนี้
 */
export const needsDriverAssignment = (statusName, hasAssignment) =>
  ["Processing", "Rejected"].includes(statusName) && !hasAssignment;

/** คอลัมน์วันที่ใน claims ที่ backend /updateClaimDate อนุญาต สำหรับแต่ละสถานะ */
export const STATUS_DATE_COLUMN = {
  Pending: "approve_date", // ไม่มีคอลัมน์เฉพาะของ Pending (ใช้เฉพาะตอนถอยสถานะ — ดู CHANGELOG)
  Approved: "approve_date",
  Rejected: "approve_date",
  Processing: "warehouse_receive_date",
  Shipping: "delivery_date",
  Delivered: "receive_finish_date",
};
