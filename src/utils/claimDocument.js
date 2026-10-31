// src/utils/claimDocument.js
// [DOC-FIX 2026-10-31] รวมข้อมูลสำหรับ "ใบรับ-เบิก-ส่ง สินค้าแตกเอเย่นต์" (เอกสารใบเคลมออนไลน์)
// กติกา: ข้อมูลที่ยังไม่มีในระบบ หรือสถานะยังไปไม่ถึง → ไม่แสดง (ใช้ "-" / เว้นว่าง)
//
// ที่มาของข้อมูล
//   คลังสินค้า              claims.warehouse
//   เล่มที่-เลขที่           claims.claim_no
//   เลขที่ใบส่งของ (รายแถว)  claims.shipment — เว้นว่างถ้าสาเหตุแตก = "แตกแห้งหลังการส่ง/หลังขนส่ง"
//   วันที่รับสินค้า          เวลาที่ พขร. แจ้งเคลม (claims.claim_date)
//   วันที่เบิกสินค้าจากคลัง  เวลาที่ Staff เปลี่ยนเป็น Processing
//   ผู้อนุมัติ                User ที่เปลี่ยนเป็น Approved (Rejected = ไม่แสดง) — ไม่แสดงวันที่ในเอกสาร [DOC-FIX R2]
//   ผู้สอบทาน               ไฟล์ลายเซ็นของคลัง (ตั้งค่าในหน้า Admin)
//   1. พขร. ผู้รับคืน        User ที่สร้างเคลม + เวลา Pending, ทะเบียน = claims.truckname
//   2. รับสินค้าจาก พขร.     User + เวลาที่เปลี่ยนเป็น Processing
//   3. พขร. ผู้ส่งคืน        User/พขร. + เวลาที่เป็น Delivered, ทะเบียน = รถที่มอบหมาย
//   4. ผู้ส่งคืน (เอเย่นต์)   ชื่อ User ตัวแทนของ Agent นั้น + เวลาที่ยืนยันการส่งเคลม (กดเอง/อัตโนมัติ)
//   5. ผู้รับสินค้า (เอเย่นต์) ชื่อ User ตัวแทนของ Agent นั้น + เวลาที่ยืนยันรับสินค้า (กดเอง/อัตโนมัติ)
//   จำนวนแตก               จำนวนที่ Staff กรอกตอน Processing (claim_items.qty) — ยังไม่ถึง Processing = "-"

import dayjs from "dayjs";
import { getStatusName } from "../constants/claimStatus";
import {
  sortLogs,
  getStatusChangeLogs,
  getStatusStampDate,
  getLatestDecision,
  getStepIndex,
  isRejectedFlow,
  getDriverAssignments,
  getDeliveryDateByStatus,
} from "./claimFlow";
import { readConfirm, CONFIRM_KIND } from "./claimConfirm";

export const fmtDate = (v) => (v && dayjs(v).isValid() ? dayjs(v).format("DD/MM/YYYY") : "-");
export const fmtDateTime = (v) => (v && dayjs(v).isValid() ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-");

/** ดึงข้อความสาเหตุแตกจาก remark (รองรับทั้งข้อความและ JSON) */
export const getItemCause = (item) => {
  const raw = item?.item_remark ?? item?.itemRemark ?? item?.remark ?? "";
  if (!raw) return "";
  if (typeof raw === "object") return raw.itemRemark || raw.item_remark || raw.remark || "";
  const str = String(raw).trim();
  if (str.startsWith("{")) {
    try {
      const parsed = JSON.parse(str);
      return parsed.itemRemark || parsed.item_remark || parsed.remark || parsed.detail || "";
    } catch {
      /* ใช้ข้อความเดิม */
    }
  }
  return str;
};

/** จัดกลุ่มสาเหตุ: "after" แตกแห้งหลังการส่ง, "transport" แตกจากการขนส่ง, "other" อื่นๆ */
export const classifyCause = (cause) => {
  const t = String(cause || "");
  if (/แตกแห้ง|หลังการส่ง|หลังจากขนส่ง|หลังขนส่ง|หลังการขนส่ง/.test(t)) return "after";
  if (t.includes("อื่น")) return "other";
  return "transport"; // รวมกรณีไม่ระบุ (เหมือนค่าเริ่มต้นของเอกสารเดิม)
};

const userName = (usersMap, id) => {
  const key = String(id ?? "").trim();
  if (!key || key === "0" || key === "null") return "";
  return usersMap[key] || `ID: ${key}`;
};

/**
 * [DOC-FIX R2/R4] หา User ตัวแทนของ Agent สำหรับลงชื่อช่อง 4–5
 *
 * [R4] แก้กรณีหาไม่เจอ (เอกสารขึ้น "ระบบยืนยันอัตโนมัติ"):
 *   claims.agent_id อาจเก็บเป็น "รหัส Agent" (agent_code) แต่ users.agent_ids เป็น agents.agent_id (ตัวเลขภายใน)
 *   → แปลงผ่านตาราง agents ให้ได้ทั้ง agent_id และ agent_code ก่อนเทียบ
 *
 * ลำดับการเลือก
 *   1. คนที่กดยืนยันเอง (ถ้าผูกกับ Agent นี้)
 *   2. User ฝั่งลูกค้า (role_id 2) ที่ผูกกับ Agent นี้ — คนที่ยังใช้งานอยู่ก่อน
 *   3. User อื่นใดที่ผูกกับ Agent นี้
 *   4. User ฝั่งลูกค้าที่เคยบันทึกข้อมูลในเคลมนี้ (เช่น ส่งข้อความ/กดยืนยัน)
 */
const pickAgentRepresentative = (users, claim, preferUserId, agents = [], logs = []) => {
  const list = Array.isArray(users) ? users : [];
  const nameOf = (u) => u.full_name || u.fullname || u.name || u.username || `ID: ${u.user_id ?? u.id}`;
  const idOf = (u) => String(u.user_id ?? u.id);
  const isActive = (u) =>
    u.status === undefined || u.status === null || ["1", "true", "active"].includes(String(u.status).toLowerCase());
  const byUserIdAsc = (a, b) => Number(idOf(a)) - Number(idOf(b));

  // รวมรหัส Agent ทุกรูปแบบของเคลมนี้ (agent_id ↔ agent_code)
  const keys = new Set(
    [claim?.agent_id, claim?.agent_code].filter((v) => v !== undefined && v !== null && v !== "").map((v) => String(v).trim())
  );
  (Array.isArray(agents) ? agents : []).forEach((a) => {
    const aId = a?.agent_id ?? a?.id;
    const aCode = a?.agent_code;
    if ((aId !== undefined && keys.has(String(aId))) || (aCode && keys.has(String(aCode).trim()))) {
      if (aId !== undefined && aId !== null) keys.add(String(aId));
      if (aCode) keys.add(String(aCode).trim());
    }
  });

  const linked = keys.size
    ? list.filter((u) => {
        const ids = Array.isArray(u.agent_ids) ? u.agent_ids : u.agent_id !== undefined ? [u.agent_id] : [];
        return ids.some((id) => keys.has(String(id)));
      })
    : [];

  if (preferUserId) {
    const preferred = linked.find((u) => idOf(u) === String(preferUserId));
    if (preferred) return nameOf(preferred);
  }

  const customers = linked.filter((u) => Number(u.role_id) === 2).sort(byUserIdAsc);
  const pick = customers.find(isActive) || customers[0] || [...linked].sort(byUserIdAsc).find(isActive) || linked[0];
  if (pick) return nameOf(pick);

  // สำรอง: User ฝั่งลูกค้าที่เคยบันทึก Log ในเคลมนี้ (ล่าสุดก่อน)
  const customerIds = new Set(list.filter((u) => Number(u.role_id) === 2).map(idOf));
  const fromLogs = [...(Array.isArray(logs) ? logs : [])]
    .reverse()
    .map((l) => String(l.update_by ?? l.user_id ?? ""))
    .find((id) => customerIds.has(id));
  if (fromLogs) return nameOf(list.find((u) => idOf(u) === fromLogs));

  return null;
};

const latestChangeLog = (logs, statusIds) => {
  const ids = statusIds.map(String);
  const matched = getStatusChangeLogs(logs).filter(
    (l) => ids.includes(String(l.status ?? l.status_id)) && !String(l.remark || "").includes("ถอยสถานะ")
  );
  return matched[matched.length - 1] || null;
};

/**
 * @param {object} p
 * @param {object} p.claim          แถวจากตาราง claims (+ agent_name)
 * @param {Array}  p.items          รายการสินค้า (claim_items + item_name)
 * @param {Array}  p.statusLogs     Log ของเคลมนี้
 * @param {Array}  p.approveLogs    claim_approves ของเคลมนี้
 * @param {Array}  p.deliveries     ตาราง Delivery (ทั้งหมดหรือเฉพาะเคลมนี้)
 * @param {object} p.usersMap       { user_id: ชื่อ }
 * @param {Array}  p.users          รายชื่อผู้ใช้เต็ม (มี role_id, agent_ids) ใช้หาตัวแทน Agent
 * @param {Array}  p.agents         ตาราง agents (agent_id, agent_code) ใช้จับคู่รหัส Agent [R4]
 * @param {string} p.agentName
 * @param {object} p.signature      { reviewer_name, image_url } ของคลังนี้ (ถ้ามี)
 */
export const buildClaimDocument = ({
  claim = {},
  items = [],
  statusLogs = [],
  approveLogs = [],
  deliveries = [],
  usersMap = {},
  users = [],
  agents = [], // [DOC-FIX R4]
  agentName = "",
  signature = null,
  forCustomer = false, // [DOC-FIX R3] true = สำเนาสำหรับลูกค้า (ซ่อนข้อมูลภายในคลัง)
}) => {
  const logs = sortLogs(statusLogs);
  const statusName = getStatusName(String(claim.current_status ?? "").trim() || "5");
  const step = getStepIndex(statusName);
  const rejected = isRejectedFlow(statusName, logs);
  const decision = getLatestDecision(logs);
  const claimId = claim.claim_id;

  // ---------- Approved ----------
  let approver = null;
  if (step >= 1 && !rejected && decision === "Approved") {
    const log = latestChangeLog(logs, ["6"]);
    const approve = [...approveLogs]
      .filter((a) => ["true", "1"].includes(String(a.approve_status)))
      .sort((a, b) => Number(b.approve_id || 0) - Number(a.approve_id || 0))[0];
    const at = getStatusStampDate(logs, ["6"]) || approve?.approve_date || claim.approve_date;
    const name = userName(usersMap, log?.update_by) || userName(usersMap, approve?.approve_by);
    if (name || at) approver = { name: name || "-", at: fmtDateTime(at) };
  }

  // ---------- Processing (เบิกสินค้า / รับสินค้าจาก พขร.) ----------
  let staffReceive = null;
  if (step >= 2 && !rejected) {
    const log = latestChangeLog(logs, ["8"]);
    const at = getStatusStampDate(logs, ["8"]) || claim.warehouse_receive_date;
    staffReceive = { name: userName(usersMap, log?.update_by) || "-", at: fmtDateTime(at), rawAt: at };
  }

  // ---------- Delivered (พขร. ส่งคืน) ----------
  const assignment = getDriverAssignments(deliveries, claimId)[0];
  const deliveryRow = (status) =>
    (Array.isArray(deliveries) ? deliveries : [])
      .filter((d) => String(d.claim_id) === String(claimId) && String(d.delivery_status) === String(status))
      .sort((a, b) => Number(b.delivery_id || 0) - Number(a.delivery_id || 0))[0];

  let driverReturn = null;
  if (step >= 4) {
    const log = latestChangeLog(logs, ["10"]);
    const row10 = deliveryRow(10);
    const row9 = deliveryRow(9);
    const at = getStatusStampDate(logs, ["10"]) || getDeliveryDateByStatus(deliveries, claimId, 10) || claim.receive_finish_date;
    const driverCode = row10?.driver_id || row9?.driver_id || assignment?.driver_id;
    const name = userName(usersMap, log?.update_by) || (driverCode ? `พขร. รหัส ${driverCode}` : "-");
    driverReturn = {
      name,
      at: fmtDateTime(at),
      rawAt: at,
      plate: row10?.truck_plate || row9?.truck_plate || assignment?.truck_plate || "-",
    };
  }

  // ---------- Pending (พขร. รับคืนจากเอเย่นต์) ----------
  const driverPickup = {
    name: userName(usersMap, claim.created_by) || "-",
    at: fmtDateTime(claim.claim_date || claim.created_at),
    plate: claim.truckname || "-",
  };

  // ---------- ลูกค้ายืนยัน ----------
  const submit = readConfirm(logs, CONFIRM_KIND.SUBMIT, usersMap);
  const receive = step >= 4 ? readConfirm(logs, CONFIRM_KIND.RECEIVE, usersMap) : null;
  // [DOC-FIX R2] ลงชื่อด้วย User ตัวแทนของ Agent เสมอ (รวมกรณีระบบยืนยันอัตโนมัติ)
  const agentSigner = (confirm) => {
    if (!confirm) return null;
    const rep = pickAgentRepresentative(users, claim, confirm.isAuto ? null : confirm.userId, agents, logs);
    return { name: rep || confirm.userName, at: fmtDateTime(confirm.at), isAuto: confirm.isAuto };
  };
  const agentSubmit = agentSigner(submit);
  const agentReceive = agentSigner(receive);

  // ---------- รายการสินค้า ----------
  const showReturnQty = (step >= 2 && !rejected) || (rejected && step >= 3);
  const showBrokenQty = step >= 2 && !rejected; // [DOC-FIX R2] จำนวนแตก = จำนวนที่กรอกตอน Processing
  const shipment = String(claim.shipment || "").trim();
  const rows = (Array.isArray(items) ? items : []).map((item, idx) => {
    const cause = getItemCause(item);
    const kind = classifyCause(cause);
    const returned = Number(item.qtyreceived) > 0 ? item.qtyreceived : item.qty;
    return {
      key: item.claim_item_id || item.key || idx,
      shipment: kind === "after" ? "" : shipment || "-",
      productName: item.item_name || item.itemName || item.productName || (item.item_id ? `สินค้า ${item.item_id}` : "-"),
      brokenQty: showBrokenQty ? item.qty ?? "-" : "-",
      cause: cause || "-",
      causeKind: kind,
      receivedQty: item.qtychang ?? "-",
      returnDate: driverReturn ? fmtDate(driverReturn.rawAt) : "-",
      returnedQty: showReturnQty ? returned ?? "-" : "-",
    };
  });

  const kinds = new Set(rows.map((r) => r.causeKind));

  const doc = {
    statusName,
    isRejected: rejected,
    claimNo: claim.claim_no || claim.claim_id || "-",
    warehouse: claim.warehouse || "-",
    agentName: agentName || claim.agent_name || "-",
    causeFlags: {
      transport: kinds.has("transport"),
      after: kinds.has("after"),
      other: kinds.has("other"),
    },
    receiveDate: fmtDate(claim.claim_date || claim.created_at),
    withdrawDate: staffReceive ? fmtDate(staffReceive.rawAt) : "-",
    rows,
    approver,
    reviewer: signature
      ? { name: signature.reviewer_name || "", signatureUrl: signature.image_url || "" }
      : null,
    driverPickup,
    staffReceive,
    driverReturn,
    agentSubmit,
    agentReceive,
  };

  // [DOC-FIX R3] สำเนาสำหรับลูกค้า: ไม่แสดงข้อมูลภายในคลัง แม้ในระบบจะมีข้อมูลแล้ว
  //   - จำนวนแตก (จำนวนที่คลังอนุมัติเปลี่ยนตอน Processing)
  //   - วันที่เบิกสินค้าจากคลัง
  //   - ลงชื่อผู้อนุมัติ และลายเซ็น/ชื่อผู้สอบทาน
  //   - ลงชื่อ 2. รับสินค้าจาก พขร. (พนักงานคลังสินค้า) ทั้งชื่อและวันที่
  if (forCustomer) {
    return {
      ...doc,
      rows: doc.rows.map((r) => ({ ...r, brokenQty: "" })),
      withdrawDate: "",
      approver: null,
      reviewer: null,
      staffReceive: null,
    };
  }

  return doc;
};
