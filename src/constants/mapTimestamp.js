import dayjs from "dayjs";
import { CLAIM_STATUS_MAP } from "./claimStatus"; // ดึง Mapping Constants มาใช้แทน Hardcode

const DATE_FORMAT = "DD/MM/YYYY HH:mm";

// Helper สำหรับ Format Date ให้ปลอดภัย
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const parsed = dayjs(dateStr);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : null;
};

/**
 * แปลงรายการ Logs ให้เป็น Map ของเวลาตาม Status ID
 * @param {Array} logs - รายการ claim_status_logs จาก API
 * @returns {Object} Key เป็น Status ID และ Value เป็นวันที่ที่ Format แล้ว
 */
export const getStatusTimeMap = (logs = []) => {
  if (!Array.isArray(logs)) return {};

  return logs.reduce((acc, log) => {
    if (log?.status && log?.update_date) {
      acc[String(log.status)] = formatDate(log.update_date);
    }
    return acc;
  }, {});
};

/**
 * ดึงเวลาของแต่ละสถานะเพื่อนำไปแสดงผล
 */
export const getTimestampFromLogs = (logs = []) => {
  const statusTimes = getStatusTimeMap(logs);

  return {
    createdTime: statusTimes["1"] ?? "-",
    pendingTime: statusTimes["5"] ?? "-",
    approvedTime: statusTimes["6"] || statusTimes["2"] || "-",
    deliveredTime: statusTimes["9"] ?? "-",
    finishTime: statusTimes["10"] ?? "-",
  };
};