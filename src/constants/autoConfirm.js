// src/constants/autoConfirm.js
// [DOC-FIX 2026-10-31] ระยะเวลารอให้ลูกค้ากดยืนยัน ก่อนที่ระบบจะยืนยันแทนอัตโนมัติ
//
// ตั้งค่าได้ใน .env (หน่วย: วินาที) — ต้องรีสตาร์ต `npm run frontend` หลังแก้ .env
//   VITE_AUTO_CONFIRM_SUBMIT_SECONDS   ยืนยันการส่งเคลม (นับจากเวลาที่ พขร. แจ้งเคลม = Pending)
//   VITE_AUTO_CONFIRM_RECEIVE_SECONDS  ยืนยันรับสินค้าเคลม (นับจากเวลาที่สถานะเป็น Delivered)
//
// ถ้าไม่ได้ตั้งค่า จะใช้ค่าสำหรับใช้งานจริง:
//   - ยืนยันส่งเคลม 24 ชม. (ลูกค้าส่งของให้ พขร. ต่อหน้า ยืนยันได้ภายในวันเดียว)
//   - ยืนยันรับสินค้า 72 ชม. (เผื่อของถึงช่วงเย็น/วันหยุด ลูกค้ามีเวลาตรวจนับก่อน)

const readSeconds = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

export const AUTO_CONFIRM_SUBMIT_SECONDS = readSeconds(env.VITE_AUTO_CONFIRM_SUBMIT_SECONDS, 24 * 60 * 60);
export const AUTO_CONFIRM_RECEIVE_SECONDS = readSeconds(env.VITE_AUTO_CONFIRM_RECEIVE_SECONDS, 72 * 60 * 60);

/** แปลงวินาทีเป็นข้อความอ่านง่าย เช่น "24 ชม.", "10 วินาที" */
export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} วินาที`;
  if (s < 3600) return `${Math.round(s / 60)} นาที`;
  const h = s / 3600;
  return Number.isInteger(h) ? `${h} ชม.` : `${h.toFixed(1)} ชม.`;
};
