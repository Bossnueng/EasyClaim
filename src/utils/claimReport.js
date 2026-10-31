import { buildClaimDocument } from "./claimDocument";
import { getStatusName } from "../constants/claimStatus";
import { getStatusChangeLogs, getStepIndex, isRejectedFlow, sortLogs } from "./claimFlow";

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "" || String(v).trim() === "-";

const firstFilled = (...values) => {
  const found = values.find((v) => !isBlank(v));
  return found === undefined ? "" : String(found).trim();
};

const fullNameOf = (u) =>
  u?.full_name || u?.fullname || u?.name || `${u?.first_name || ""} ${u?.last_name || ""}`.trim() || "";

const employeeCodeOf = (u) => firstFilled(u?.employee_code, u?.user_code, u?.username);

const findUser = (users, key) => {
  if (isBlank(key)) return null;
  const k = String(key).trim();
  const list = Array.isArray(users) ? users : [];
  return (
    list.find((u) => String(u?.user_id ?? u?.id ?? "").trim() === k) ||
    list.find((u) => [u?.username, u?.user_code, u?.employee_code].some((c) => !isBlank(c) && String(c).trim() === k)) ||
    null
  );
};

const driverLabelFromCode = (users, code) => {
  if (isBlank(code)) return "";
  const user = findUser(users, code);
  return firstFilled(fullNameOf(user), String(code).trim());
};

const deliveriesOf = (deliveries, claimId) =>
  (Array.isArray(deliveries) ? deliveries : [])
    .filter((d) => String(d.claim_id) === String(claimId))
    .sort((a, b) => Number(b.delivery_id || 0) - Number(a.delivery_id || 0));

const latestRowWithStatus = (rows, status) => rows.find((d) => String(d.delivery_status) === String(status)) || null;

export const getAssignmentFromLogs = (logs) => {
  const list = sortLogs(logs).filter((l) => String(l.remark || "").includes("มอบหมายงาน พขร. (Delivery):"));
  const last = list[list.length - 1];
  if (!last) return null;
  const driver = last.remark.match(/Driver ID ([^,]+)/);
  const plate = last.remark.match(/ทะเบียนรถ (.+)/);
  return {
    driver_id: driver ? driver[1].trim() : "",
    truck_plate: plate ? plate[1].trim() : "",
  };
};

export const getPickupDriver = ({ claim = {}, users = [], logData = {} }) => {
  const creator = findUser(users, claim.created_by);
  return {
    name: firstFilled(
      fullNameOf(creator),
      employeeCodeOf(creator),
      logData.driverName,
      logData.driver_name,
      claim.created_by
    ),
    plate: firstFilled(claim.truckname, claim.truck_plate, logData.truckPlate, logData.truck_plate),
  };
};

export const getDeliveryDriver = ({ claim = {}, logs = [], deliveries = [], users = [], logData = {} }) => {
  const rows = deliveriesOf(deliveries, claim.claim_id);
  const candidates = [
    latestRowWithStatus(rows, 8),
    getAssignmentFromLogs(logs),
    latestRowWithStatus(rows, 9),
    latestRowWithStatus(rows, 10),
  ];
  const source = candidates.find((r) => r && !isBlank(r.driver_id)) || null;
  const plate = firstFilled(
    source?.truck_plate,
    ...candidates.map((r) => r?.truck_plate),
    claim.delivery_plate,
    logData.deliveryPlate,
    logData.delivery_plate
  );

  if (source) {
    return { name: driverLabelFromCode(users, source.driver_id), code: String(source.driver_id).trim(), plate };
  }

  const legacy = firstFilled(claim.delivery_driver, logData.deliveryDriver, logData.delivery_driver);
  if (legacy) return { name: driverLabelFromCode(users, legacy), code: legacy, plate };

  const deliveredLogs = getStatusChangeLogs(logs).filter(
    (l) => String(l.status ?? l.status_id) === "10" && !String(l.remark || "").includes("ถอยสถานะ")
  );
  const deliveredBy = deliveredLogs[deliveredLogs.length - 1]?.update_by;
  const deliveredUser = findUser(users, deliveredBy);
  return {
    name: firstFilled(fullNameOf(deliveredUser), employeeCodeOf(deliveredUser), deliveredBy),
    code: "",
    plate,
  };
};

export const getReportQuantities = ({ item = {}, claim = {}, logs = [] }) => {
  const statusName = getStatusName(String(claim.current_status ?? claim.status ?? "").trim() || "5");
  const processed = getStepIndex(statusName) >= 2 && !isRejectedFlow(statusName, logs);
  const received = item.qtychang ?? item.qty ?? 0;
  return {
    received,
    broken: processed ? item.qty ?? "-" : "-",
  };
};

export const getAgentSubmitterName = ({ claim = {}, logs = [], deliveries = [], users = [], agents = [] }) => {
  const usersMap = {};
  (Array.isArray(users) ? users : []).forEach((u) => {
    const id = u?.user_id ?? u?.id;
    if (!isBlank(id)) usersMap[String(id)] = fullNameOf(u) || u?.username || `ID: ${id}`;
  });
  const doc = buildClaimDocument({ claim, items: [], statusLogs: logs, deliveries, usersMap, users, agents });
  return doc.agentSubmit?.name || "";
};

export const getClaimReportPeople = ({ claim = {}, logs = [], deliveries = [], users = [], agents = [], logData = {} }) => ({
  pickup: getPickupDriver({ claim, users, logData }),
  delivery: getDeliveryDriver({ claim, logs, deliveries, users, logData }),
  agentSubmitter: getAgentSubmitterName({ claim, logs, deliveries, users, agents }),
});
