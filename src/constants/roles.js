// src/constants/roles.js
// [QA-FIX 2026-10-31] Test Case 1.2 / 1.3 — รวมเลข Role ไว้ที่เดียว (เดิม AppRouter ใช้ [1,3,4,5] แต่ MenuList ใช้ [1,4,5])
//   1 = ผู้ดูแลระบบ (Admin) · 2 = ตัวแทนจำหน่าย (Customer/Agent) · 3, 4, 5 = เจ้าหน้าที่ / คลังสินค้า

export const ADMIN_ROLE_ID = 1;
export const CUSTOMER_ROLE_ID = 2;

/** Role ที่เข้าใช้งานฝั่ง Staff ได้ (Admin + เจ้าหน้าที่/คลังสินค้า) */
export const STAFF_ROLE_IDS = [1, 3, 4, 5];

/**
 * Role ที่ "อนุมัติ / ไม่อนุมัติ" เคลมได้ (ขั้น Pending → Approved/Rejected)
 * ตามสเปก Test Case 1.2–1.3: Admin อนุมัติได้, Warehouse Staff อนุมัติไม่ได้
 * ⚠️ ถ้าต้องการให้ Role อื่น (เช่น หัวหน้า role 4) อนุมัติได้ด้วย ให้เพิ่มเลขในอาร์เรย์นี้
 */
export const APPROVER_ROLE_IDS = [1];

const roleIdOf = (user) => Number(user?.role_id);

export const isAdminUser = (user) =>
  roleIdOf(user) === ADMIN_ROLE_ID || String(user?.role || "").toLowerCase() === "admin";

export const isStaffUser = (user) => {
  if (!user) return false;
  const roleStr = String(user.role || user.user_type || "").toLowerCase();
  return STAFF_ROLE_IDS.includes(roleIdOf(user)) || roleStr === "staff" || roleStr === "admin";
};

export const canApproveClaim = (user) => APPROVER_ROLE_IDS.includes(roleIdOf(user));
