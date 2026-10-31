import { getStatusName } from "../constants/claimStatus";

const NOTE_LOG_PATTERNS = [
  "[MSG]",
  "มอบหมายงาน พขร.",
  "ลูกค้ากดยืนยันการส่งเคลม",
  "ลูกค้ายืนยันรับสินค้า",
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

export const getStatusChangeLogs = (logs = []) => sortLogs(logs).filter((l) => !isNoteLog(l));

export const getStatusStampDate = (logs = [], statusIds = []) => {
  const ids = statusIds.map(String);
  const matched = getStatusChangeLogs(logs).filter(
    (l) => ids.includes(String(l.status ?? l.status_id)) && !isRevertLog(l)
  );
  const last = matched[matched.length - 1];
  return last ? last.update_date || last.created_at || last.created_date || null : null;
};

export const getLatestDecision = (logs = []) => {
  const decisions = getStatusChangeLogs(logs).filter((l) => ["6", "7"].includes(String(l.status ?? l.status_id)));
  const last = decisions[decisions.length - 1];
  if (!last) return null;
  return String(last.status ?? last.status_id) === "7" ? "Rejected" : "Approved";
};

export const normalizeStatus = (rawStatus) => getStatusName(String(rawStatus ?? "").trim() || "5");

export const getStepIndex = (statusName) => STEP_INDEX[statusName] ?? 0;

export const isRejectedFlow = (statusName, logs = []) => {
  if (statusName === "Rejected") return true;
  if (["Shipping", "Delivered"].includes(statusName)) return getLatestDecision(logs) === "Rejected";
  return false;
};

export const getDriverAssignments = (deliveries = [], claimId) =>
  (Array.isArray(deliveries) ? deliveries : [])
    .filter((d) => String(d.claim_id) === String(claimId) && String(d.delivery_status) === "8")
    .sort((a, b) => Number(b.delivery_id || 0) - Number(a.delivery_id || 0));

export const getDeliveryDateByStatus = (deliveries = [], claimId, statusId) => {
  const rows = (Array.isArray(deliveries) ? deliveries : [])
    .filter((d) => String(d.claim_id) === String(claimId) && String(d.delivery_status) === String(statusId))
    .sort((a, b) => Number(b.delivery_id || 0) - Number(a.delivery_id || 0));
  return rows[0]?.receive_date || rows[0]?.created_at || null;
};

export const needsDriverAssignment = (statusName, hasAssignment) =>
  ["Processing", "Rejected"].includes(statusName) && !hasAssignment;

export const STATUS_DATE_COLUMN = {
  Pending: "approve_date",
  Approved: "approve_date",
  Rejected: "approve_date",
  Processing: "warehouse_receive_date",
  Shipping: "delivery_date",
  Delivered: "receive_finish_date",
};
