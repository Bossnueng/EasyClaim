export const ADMIN_ROLE_ID = 1;
export const CUSTOMER_ROLE_ID = 2;

export const STAFF_ROLE_IDS = [1, 3, 4, 5];

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
