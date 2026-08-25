// 1. Structure หลักสำหรับ Map ข้อมูลตาม status_id
export const CLAIM_STATUS_MAP = {
  "1": { name: "สร้างรายการเคลม", color: "default", priority: 1 },
  "2": { name: "มีสิทธิ์เคลม", color: "cyan", priority: 3 },
  "3": { name: "ไม่มีสิทธิ์เคลม", color: "error", priority: 9 },
  "4": { name: "รับสินค้าจริงแล้ว", color: "purple", priority: 4 },
  "5": { name: "รอการพิจารณา", color: "processing", priority: 2 },
  "6": { name: "อนุมัติเคลมสินค้า", color: "success", priority: 5 },
  "7": { name: "ไม่อนุมัติเคลมสินค้า", color: "error", priority: 10 },
  "8": { name: "กำลังดำเนินการเปลี่ยนสินค้า", color: "blue", priority: 6 },
  "9": { name: "กำลังจัดส่งสินค้าเคลม", color: "warning", priority: 7 },
  "10": { name: "จัดส่งสินค้าเคลมสำเร็จ", color: "green", priority: 8 },
};

// 2. STATUS_PRIORITY สำหรับรองรับโค้ดเดิมที่เรียกใช้ชื่อภาษาไทย
export const STATUS_PRIORITY = {
  สร้างรายการเคลม: 1,
  รอการพิจารณา: 2,
  มีสิทธิ์เคลม: 3,
  รับสินค้าจริงแล้ว: 4,
  อนุมัติเคลมสินค้า: 5,
  กำลังดำเนินการเปลี่ยนสินค้า: 6,
  กำลังจัดส่งสินค้าเคลม: 7,
  จัดส่งสินค้าเคลมสำเร็จ: 8,
  ไม่มีสิทธิ์เคลม: 9,
  ไม่อนุมัติเคลมสินค้า: 10,
};

// 🟢 เพิ่มเติม: หมวดหมู่ Filter สไตล์ Shopee ฝั่ง Customer
export const CUSTOMER_FILTER_TABS = [
  "ทั้งหมด",
  "รอพิจารณาสิทธิ์เคลม",
  "รอส่งสินค้าคืน",
  "กำลังดำเนินการ",
  "สำเร็จ",
  "ปฏิเสธ/ยกเลิก",
];

export const CUSTOMER_STATUS_GROUPS = {
  "ยื่นเคลมแล้ว": ["สร้างรายการเคลม", "รอการพิจารณา"],
  "รอส่งสินค้าคืน": ["มีสิทธิ์เคลม"],
  "กำลังดำเนินการ": ["รับสินค้าจริงแล้ว","อนุมัติเคลมสินค้า","กำลังดำเนินการเปลี่ยนสินค้า","กำลังจัดส่งสินค้าเคลม",],
  "สำเร็จ": ["จัดส่งสินค้าเคลมสำเร็จ"],
  "ปฏิเสธ/ยกเลิก": ["ไม่มีสิทธิ์เคลม", "ไม่อนุมัติเคลมสินค้า"],
};



// 3. Helper Functions
export const getStatusName = (statusId) => {
  return CLAIM_STATUS_MAP[String(statusId)]?.name || "ไม่ระบุสถานะ";
};

export const getStatusColor = (statusId) => {
  return CLAIM_STATUS_MAP[String(statusId)]?.color || "default";
};

// 4. FILTER_OPTIONS สำหรับตัวกรองหน้า StaffClaimList
export const FILTER_OPTIONS = ["ทั้งหมด"].concat(Object.keys(STATUS_PRIORITY));