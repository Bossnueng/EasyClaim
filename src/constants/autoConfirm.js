const readSeconds = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

// ค่าที่ตั้งตอน container เริ่มทำงาน (public/env-config.js เขียนโดย docker/40-bev-claim-config.sh)
// ทำให้ image เดียวกันใช้เวลาต่างกันได้ตาม environment (เช่น UAT 5 นาที, PROD 24/72 ชม.)
// ถ้าไม่ได้ตั้ง จะใช้ค่า VITE_* ตอน build และสุดท้ายคือค่าเริ่มต้นในไฟล์นี้
const runtime = (typeof window !== "undefined" && window.__BEV_CLAIM_CONFIG__) || {};

export const AUTO_CONFIRM_SUBMIT_SECONDS = readSeconds(
  runtime.AUTO_CONFIRM_SUBMIT_SECONDS,
  readSeconds(env.VITE_AUTO_CONFIRM_SUBMIT_SECONDS, 24 * 60 * 60)
);
export const AUTO_CONFIRM_RECEIVE_SECONDS = readSeconds(
  runtime.AUTO_CONFIRM_RECEIVE_SECONDS,
  readSeconds(env.VITE_AUTO_CONFIRM_RECEIVE_SECONDS, 72 * 60 * 60)
);

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} วินาที`;
  if (s < 3600) return `${Math.round(s / 60)} นาที`;
  const h = s / 3600;
  return Number.isInteger(h) ? `${h} ชม.` : `${h.toFixed(1)} ชม.`;
};
