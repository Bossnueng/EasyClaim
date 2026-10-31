const readSeconds = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

export const AUTO_CONFIRM_SUBMIT_SECONDS = readSeconds(env.VITE_AUTO_CONFIRM_SUBMIT_SECONDS, 24 * 60 * 60);
export const AUTO_CONFIRM_RECEIVE_SECONDS = readSeconds(env.VITE_AUTO_CONFIRM_RECEIVE_SECONDS, 72 * 60 * 60);

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} วินาที`;
  if (s < 3600) return `${Math.round(s / 60)} นาที`;
  const h = s / 3600;
  return Number.isInteger(h) ? `${h} ชม.` : `${h.toFixed(1)} ชม.`;
};
