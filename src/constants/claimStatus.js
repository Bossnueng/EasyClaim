/**
 * src/constants/claimStatus.js
 */

export const CLAIM_STATUS_MAP = {
  "1": { priority: 1, name: "Pending", staffName: "Pending", customerName: "Pending", color: "processing" },
  "5": { priority: 1, name: "Pending", staffName: "Pending", customerName: "Pending", color: "processing" },
  "6": { priority: 2, name: "Approved", staffName: "Approved", customerName: "Approved", color: "success" },
  "7": { priority: 9, name: "Rejected", staffName: "Rejected", customerName: "Rejected", color: "error" },
  "8": { priority: 3, name: "Processing", staffName: "Processing", customerName: "Processing", color: "blue" },
  "9": { priority: 4, name: "Shipping", staffName: "Shipping", customerName: "Shipping", color: "warning" },
  "10": { priority: 5, name: "Delivered", staffName: "Delivered", customerName: "Delivered", color: "green" },
};

// 🟢 ตัวเลือก Filter สำหรับ Staff และ Customer
export const FILTER_OPTIONS = [
  "ทั้งหมด",
  "Pending",
  "Approved",
  "Processing",
  "Shipping",
  "Delivered",
  "Rejected",
];

export const CUSTOMER_FILTER_TABS = FILTER_OPTIONS;

// 🟢 Mapping กลุ่มสถานะสำหรับใช้กรองข้อมูลใน List
export const CUSTOMER_STATUS_GROUPS = {
  "Pending": [
    "1", "5", 1, 5, 
    "Pending", "pending", "สร้างรายการเคลม", "สร้างรายการเคลมใหม่", "รายการเคลมใหม่", "รอการพิจารณา"
  ],
  "Approved": [
    "6", 6, 
    "Approved", "approved", "อนุมัติเคลมสินค้า", "อนุมัติการเคลมสินค้า", "มีสิทธิ์เคลม"
  ],
  "Processing": [
    "8", 8, 
    "Processing", "processing", "กำลังดำเนินการ", "กำลังดำเนินการเปลี่ยนสินค้า", "รับสินค้าจริงแล้ว"
  ],
  "Shipping": [
    "9", 9, 
    "Shipping", "shipping", "กำลังจัดส่ง", "กำลังจัดส่งสินค้าเคลม"
  ],
  "Delivered": [
    "10", 10, 
    "Delivered", "delivered", "จัดส่งสินค้าเคลมสำเร็จ", "จัดส่งสำเร็จ"
  ],
  "Rejected": [
    "7", 7, 
    "Rejected", "rejected", "ไม่อนุมัติเคลมสินค้า", "ไม่อนุมัติการเคลมสินค้า", "ไม่มีสิทธิ์เคลม", "ปฏิเสธ"
  ],
};

export const STATUS_PRIORITY = {
  Pending: 1,
  Approved: 2,
  Processing: 3,
  Shipping: 4,
  Delivered: 5,
  Rejected: 9,
};

export const getStatusId = (statusVal) => {
  if (!statusVal) return "5";
  const val = String(statusVal).trim();

  if (val === "Pending" || val === "รอการพิจารณา") return "5";
  if (val === "Approved" || val === "อนุมัติเคลมสินค้า") return "6";
  if (val === "Rejected" || val === "ไม่อนุมัติเคลมสินค้า") return "7";
  if (val === "Processing" || val === "กำลังดำเนินการเปลี่ยนสินค้า") return "8";
  if (val === "Shipping" || val === "กำลังจัดส่งสินค้าเคลม") return "9";
  if (val === "Delivered" || val === "จัดส่งสินค้าเคลมสำเร็จ") return "10";

  return val;
};

export const getStatusName = (statusVal) => {
  if (!statusVal) return "Pending";
  const val = String(statusVal).trim();

  if (["5", "1", "รอการพิจารณา", "สร้างรายการเคลม", "pending"].includes(val.toLowerCase())) return "Pending";
  if (["6", "2", "4", "อนุมัติเคลมสินค้า", "มีสิทธิ์เคลม", "approved"].includes(val.toLowerCase())) return "Approved";
  if (["7", "3", "ไม่อนุมัติเคลมสินค้า", "ไม่มีสิทธิ์เคลม", "rejected"].includes(val.toLowerCase())) return "Rejected";
  if (["8", "กำลังดำเนินการเปลี่ยนสินค้า", "รับสินค้าจริงแล้ว", "processing"].includes(val.toLowerCase())) return "Processing";
  if (["9", "กำลังจัดส่งสินค้าเคลม", "shipping"].includes(val.toLowerCase())) return "Shipping";
  if (["10", "จัดส่งสินค้าเคลมสำเร็จ", "delivered"].includes(val.toLowerCase())) return "Delivered";

  return val;
};

export const getStatusColor = (statusVal) => {
  const statusName = getStatusName(statusVal);
  const targetObj = Object.values(CLAIM_STATUS_MAP).find(
    (item) => item.name === statusName
  );
  return targetObj?.color || "default";
};