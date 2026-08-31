import dayjs from "dayjs";
import { CLAIM_STATUS_MAP } from "./claimStatus";

// 🎯 แปลงวันที่ให้เป็นเวลา Local แบบเรียบง่าย
const formatDbDate = (dateString, format = "DD/MM/YYYY HH:mm") => {
  if (!dateString) return null;
  const parsed = dayjs(dateString);
  return parsed.isValid() ? parsed.format(format) : null;
};

export const getClaimStatusTimestamps = (claimData) => {
  if (!claimData) return {};

  const fieldMapping = {
    "1": claimData.claim_date || claimData.created_at,
    "5": claimData.claim_date || claimData.created_at,
    "2": claimData.approve_date,
    "3": claimData.updated_at,
    "4": claimData.warehouse_receive_date || claimData.driver_receive_date,
    "6": claimData.approve_date,
    "7": claimData.updated_at,
    "8": claimData.withdraw_date || claimData.updated_at,
    "9": claimData.delivery_date,
    "10": claimData.receive_finish_date,
  };

  const timestamps = {};

  Object.entries(CLAIM_STATUS_MAP).forEach(([key, config]) => {
    const rawDate = fieldMapping[key];
    const formattedDate = rawDate ? formatDbDate(rawDate) : "-";

    timestamps[key] = formattedDate;
    timestamps[config.name] = formattedDate;
    timestamps[config.customerName] = formattedDate;
  });

  return timestamps;
};