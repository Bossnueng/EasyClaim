// src/utils/claimConfirm.js
// [DOC-FIX 2026-10-31] การยืนยันของลูกค้า (ยืนยันการส่งเคลม / ยืนยันรับสินค้าเคลม) + ยืนยันอัตโนมัติเมื่อครบกำหนด
//
// ข้อมูลเก็บเป็น Log ใน claim_status_logs (ไม่ต้องแก้ backend)
//   - กดเอง:     "ลูกค้ากดยืนยันการส่งเคลมสินค้าเรียบร้อยแล้ว" / "ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว"
//   - อัตโนมัติ:  "ระบบยืนยันการส่งเคลมอัตโนมัติ (...) | AUTO_AT:<ISO>"
//                 AUTO_AT = เวลาที่ครบกำหนดจริง (ใช้ในเอกสาร) เพราะ Log อาจถูกเขียนช้ากว่ากำหนด
//                 ถ้าไม่มีใครเปิดหน้าเว็บตรงเวลาพอดี (backend ไม่มีงานตั้งเวลา)

import { AUTO_CONFIRM_SUBMIT_SECONDS, AUTO_CONFIRM_RECEIVE_SECONDS, formatDuration } from "../constants/autoConfirm";
import { sortLogs, getStatusStampDate, getDeliveryDateByStatus } from "./claimFlow";

export const CONFIRM_KIND = { SUBMIT: "submit", RECEIVE: "receive" };

const PATTERNS = {
  submit: ["ลูกค้ากดยืนยันการส่งเคลม", "ระบบยืนยันการส่งเคลมอัตโนมัติ"],
  receive: ["ลูกค้ายืนยันรับสินค้า", "ระบบยืนยันรับสินค้าอัตโนมัติ"],
};

const STATUS_OF_KIND = { submit: "5", receive: "10" };

export const MANUAL_REMARK = {
  submit: "ลูกค้ากดยืนยันการส่งเคลมสินค้าเรียบร้อยแล้ว",
  receive: "ลูกค้ายืนยันรับสินค้าเรียบร้อยแล้ว",
};

const AUTO_AT_RE = /\|\s*AUTO_AT:\s*([^\s|]+)/;

export const isConfirmLog = (log, kind) => {
  const remark = String(log?.remark || "");
  return !remark.startsWith("[MSG]") && PATTERNS[kind].some((p) => remark.includes(p));
};

/** Log ยืนยันครั้งแรกของประเภทนั้น (ถ้ามี) */
export const findConfirmLog = (logs = [], kind) => sortLogs(logs).find((l) => isConfirmLog(l, kind)) || null;

/**
 * อ่านผลการยืนยัน
 * @returns {{ isAuto: boolean, userId: string, userName: string, at: string|Date|null } | null}
 */
export const readConfirm = (logs = [], kind, usersMap = {}) => {
  const log = findConfirmLog(logs, kind);
  if (!log) return null;
  const remark = String(log.remark || "");
  const isAuto = remark.includes("อัตโนมัติ");
  const autoAt = remark.match(AUTO_AT_RE)?.[1];
  const userId = String(log.update_by ?? log.user_id ?? "");
  return {
    isAuto,
    userId,
    userName: isAuto ? "ระบบยืนยันอัตโนมัติ" : usersMap[userId] || (userId ? `ID: ${userId}` : "-"),
    at: (isAuto && autoAt) || log.update_date || log.created_at || null,
  };
};

/** เวลาเริ่มนับของแต่ละประเภท: ส่งเคลม = เวลาแจ้งเคลม (Pending), รับสินค้า = เวลาเป็น Delivered */
export const getConfirmStartAt = (kind, claim, logs = [], deliveries = []) => {
  if (kind === CONFIRM_KIND.SUBMIT) return claim?.claim_date || claim?.created_at || null;
  return (
    getStatusStampDate(logs, ["10"]) ||
    getDeliveryDateByStatus(deliveries, claim?.claim_id, 10) ||
    claim?.receive_finish_date ||
    null
  );
};

export const getConfirmTimeoutSeconds = (kind) =>
  kind === CONFIRM_KIND.SUBMIT ? AUTO_CONFIRM_SUBMIT_SECONDS : AUTO_CONFIRM_RECEIVE_SECONDS;

/** เวลาครบกำหนดยืนยันอัตโนมัติ (Date) หรือ null ถ้ายังไม่เริ่มนับ */
export const getConfirmDeadline = (kind, claim, logs, deliveries) => {
  const start = getConfirmStartAt(kind, claim, logs, deliveries);
  if (!start) return null;
  const t = new Date(start).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + getConfirmTimeoutSeconds(kind) * 1000);
};

/**
 * ประเภทที่ต้องยืนยันอัตโนมัติ "ตอนนี้"
 * - submit: ยังไม่มีการยืนยัน และเลยกำหนดนับจากเวลาแจ้งเคลม (ไม่ขึ้นกับสถานะ — Staff อาจอนุมัติก่อนลูกค้ากด)
 * - receive: สถานะ Delivered, ยังไม่ยืนยัน และเลยกำหนดนับจากเวลาส่งสำเร็จ
 */
export const getDueAutoConfirms = ({ claim, logs = [], deliveries = [], statusName, now = new Date() }) => {
  const due = [];
  [CONFIRM_KIND.SUBMIT, CONFIRM_KIND.RECEIVE].forEach((kind) => {
    if (kind === CONFIRM_KIND.RECEIVE && statusName !== "Delivered") return;
    if (findConfirmLog(logs, kind)) return;
    const deadline = getConfirmDeadline(kind, claim, logs, deliveries);
    if (deadline && now.getTime() >= deadline.getTime()) due.push({ kind, deadline });
  });
  return due;
};

export const buildAutoConfirmPayload = ({ claimId, kind, deadline, updateBy }) => ({
  claim_id: String(claimId),
  status: STATUS_OF_KIND[kind],
  remark: `${kind === CONFIRM_KIND.SUBMIT ? "ระบบยืนยันการส่งเคลมอัตโนมัติ" : "ระบบยืนยันรับสินค้าอัตโนมัติ"} (ลูกค้าไม่ได้กดยืนยันภายใน ${formatDuration(
    getConfirmTimeoutSeconds(kind)
  )}) | AUTO_AT:${deadline.toISOString()}`,
  update_by: String(updateBy || ""),
  user_id: String(updateBy || ""),
});

export const buildManualConfirmPayload = ({ claimId, kind, updateBy }) => ({
  claim_id: String(claimId),
  status: STATUS_OF_KIND[kind],
  remark: MANUAL_REMARK[kind],
  update_by: String(updateBy || ""),
  user_id: String(updateBy || ""),
});

/** ข้อความนับถอยหลัง เช่น "ระบบจะยืนยันอัตโนมัติในอีก 23 ชม." */
export const describeRemaining = (deadline, now = new Date()) => {
  if (!deadline) return "";
  const sec = Math.max(0, (deadline.getTime() - now.getTime()) / 1000);
  if (sec <= 0) return "ครบกำหนดแล้ว ระบบกำลังยืนยันอัตโนมัติ";
  return `ระบบจะยืนยันอัตโนมัติในอีก ${formatDuration(sec)}`;
};
