import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

export const parseDateSafely = (dateStr) => {
  if (!dateStr) return null;
  let parsed = dayjs(dateStr);
  if (parsed.isValid()) return parsed;
  parsed = dayjs(dateStr, "DD/MM/YYYY HH:mm");
  if (parsed.isValid()) return parsed;
  parsed = dayjs(dateStr, "YYYY-MM-DD HH:mm:ss");
  if (parsed.isValid()) return parsed;
  return null;
};

export const formatDateString = (date) => {
  const parsed = parseDateSafely(date);
  if (!parsed) return "-";
  return parsed.format("DD/MM/YYYY HH:mm");
};

export const formatDateDisplay = (date) => {
  const parsed = parseDateSafely(date);
  if (!parsed) return "-";
  return parsed.format("DD/MM/YY");
};