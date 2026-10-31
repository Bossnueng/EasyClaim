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
    }
  }
  return str;
};

export const classifyCause = (cause) => {
  const t = String(cause || "");
  if (/แตกแห้ง|หลังการส่ง|หลังจากขนส่ง|หลังขนส่ง|หลังการขนส่ง/.test(t)) return "after";
  if (t.includes("อื่น")) return "other";
  return "transport";
};

const userName = (usersMap, id) => {
  const key = String(id ?? "").trim();
  if (!key || key === "0" || key === "null") return "";
  return usersMap[key] || `ID: ${key}`;
};

const pickAgentRepresentative = (users, claim, preferUserId, agents = [], logs = []) => {
  const list = Array.isArray(users) ? users : [];
  const nameOf = (u) => u.full_name || u.fullname || u.name || u.username || `ID: ${u.user_id ?? u.id}`;
  const idOf = (u) => String(u.user_id ?? u.id);
  const isActive = (u) =>
    u.status === undefined || u.status === null || ["1", "true", "active"].includes(String(u.status).toLowerCase());
  const byUserIdAsc = (a, b) => Number(idOf(a)) - Number(idOf(b));

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

export const buildClaimDocument = ({
  claim = {},
  items = [],
  statusLogs = [],
  approveLogs = [],
  deliveries = [],
  usersMap = {},
  users = [],
  agents = [],
  agentName = "",
  signature = null,
  forCustomer = false,
}) => {
  const logs = sortLogs(statusLogs);
  const statusName = getStatusName(String(claim.current_status ?? "").trim() || "5");
  const step = getStepIndex(statusName);
  const rejected = isRejectedFlow(statusName, logs);
  const decision = getLatestDecision(logs);
  const claimId = claim.claim_id;

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

  let staffReceive = null;
  if (step >= 2 && !rejected) {
    const log = latestChangeLog(logs, ["8"]);
    const at = getStatusStampDate(logs, ["8"]) || claim.warehouse_receive_date;
    staffReceive = { name: userName(usersMap, log?.update_by) || "-", at: fmtDateTime(at), rawAt: at };
  }

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

  const driverPickup = {
    name: userName(usersMap, claim.created_by) || "-",
    at: fmtDateTime(claim.claim_date || claim.created_at),
    plate: claim.truckname || "-",
  };

  const submit = readConfirm(logs, CONFIRM_KIND.SUBMIT, usersMap);
  const receive = step >= 4 ? readConfirm(logs, CONFIRM_KIND.RECEIVE, usersMap) : null;
  const agentSigner = (confirm) => {
    if (!confirm) return null;
    const rep = pickAgentRepresentative(users, claim, confirm.isAuto ? null : confirm.userId, agents, logs);
    return { name: rep || confirm.userName, at: fmtDateTime(confirm.at), isAuto: confirm.isAuto };
  };
  const agentSubmit = agentSigner(submit);
  const agentReceive = agentSigner(receive);

  const showReturnQty = (step >= 2 && !rejected) || (rejected && step >= 3);
  const showBrokenQty = step >= 2 && !rejected;
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
