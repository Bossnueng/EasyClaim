// สถานะบัญชีผู้ใช้ (คอลัมน์ users.status เป็นข้อความ)
//   '1' / 'ACTIVE'      ใช้งานได้ (ข้อมูลเดิมใช้ทั้งสองแบบ)
//   '0' / 'INACTIVE'    ปิดการใช้งานโดย admin
//   'PENDING'           สมัครผ่านหน้าเว็บ รอ admin อนุมัติ + กำหนด role/agent
//   'REJECTED'          admin ไม่อนุมัติ
const USER_STATUS = {
  ACTIVE: "1",
  INACTIVE: "0",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
};

const normalize = (status) => String(status ?? "").trim().toUpperCase();

const isActiveStatus = (status) => ["1", "ACTIVE"].includes(normalize(status));
const isPendingStatus = (status) => normalize(status) === USER_STATUS.PENDING;
const isRejectedStatus = (status) => normalize(status) === USER_STATUS.REJECTED;

// ข้อความตอน login ไม่ได้ (null = login ได้)
const loginBlockedMessage = (status) => {
  if (isActiveStatus(status)) return null;
  if (isPendingStatus(status)) return "บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติ";
  if (isRejectedStatus(status)) return "บัญชีของคุณไม่ได้รับการอนุมัติ กรุณาติดต่อผู้ดูแลระบบ";
  return "บัญชีผู้ใช้นี้ถูกปิดการใช้งาน";
};

module.exports = {
  USER_STATUS,
  isActiveStatus,
  isPendingStatus,
  isRejectedStatus,
  loginBlockedMessage,
};
