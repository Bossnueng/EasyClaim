export const parseExtraDataFromLogs = (logs) => {
  if (!logs || !Array.isArray(logs) || logs.length === 0) return {};
  
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log && log.remark && log.remark.includes("| DATA:")) {
      try {
        const jsonStr = log.remark.split("| DATA:")[1];
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("Error parsing extra data from log remark", e);
      }
    }
  }
  return {};
};

export const getRejectReasonText = (statusLogs = [], approveLogs = [], data = {}) => {
  const rejectLog = statusLogs.slice().reverse().find((l) => l.remark && l.remark.includes("ปฏิเสธรายการเคลม:"));
  if (rejectLog) {
    const match = rejectLog.remark.match(/ปฏิเสธรายการเคลม:\s*([^|]+)/);
    if (match && match[1]) return match[1].trim();
  }
  const latestApprove = approveLogs.slice().reverse().find((a) => String(a.approve_status) === "false" || String(a.approve_status) === "0");
  if (latestApprove && latestApprove.approve_remark) return latestApprove.approve_remark;
  return data?.reject_reason || data?.remark || "";
};