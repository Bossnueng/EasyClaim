export const CLAIM_STATUS_MAP = {
  "1": { priority: 1, name: "สร้างรายการเคลม", staffName: "รายการเคลมใหม่", customerName: "สร้างรายการเคลมใหม่", color: "default" },
  "5": { priority: 2, name: "รอการพิจารณา", staffName: "รอการพิจารณา", customerName: "รอการพิจารณา", color: "processing" },
  "2": { priority: 3, name: "มีสิทธิ์เคลม", staffName: "มีสิทธิ์เคลม", customerName: "มีสิทธิ์เคลม", color: "cyan" },
  "3": { priority: 9, name: "ไม่มีสิทธิ์เคลม", staffName: "ไม่มีสิทธิ์เคลม", customerName: "ไม่มีสิทธิ์เคลม", color: "error" },
  "4": { priority: 4, name: "รับสินค้าจริงแล้ว", staffName: "รับสินค้าจริงแล้ว", customerName: "รับสินค้าจริงแล้ว", color: "purple" },
  "6": { priority: 5, name: "อนุมัติเคลมสินค้า", staffName: "อนุมัติการเคลมสินค้า", customerName: "อนุมัติการเคลมสินค้า", color: "success" },
  "7": { priority: 10, name: "ไม่อนุมัติเคลมสินค้า", staffName: "ไม่อนุมัติการเคลมสินค้า", customerName: "ไม่อนุมัติการเคลมสินค้า", color: "error" },
  "8": { priority: 6, name: "กำลังดำเนินการเปลี่ยนสินค้า", staffName: "กำลังดำเนินการเปลี่ยนสินค้า", customerName: "กำลังดำเนินการเปลี่ยนสินค้า", color: "blue" },
  "9": { priority: 7, name: "กำลังจัดส่งสินค้าเคลม", staffName: "กำลังจัดส่งสินค้าเคลม", customerName: "กำลังจัดส่งสินค้าเคลม", color: "warning" },
  "10": { priority: 8, name: "จัดส่งสินค้าเคลมสำเร็จ", staffName: "จัดส่งสินค้าเคลมสำเร็จ", customerName: "จัดส่งสินค้าเคลมสำเร็จ", color: "green" },
};

// Helper ค้นหา Config Object รองรับทั้ง ID และ Text
const getStatusConfig = (statusVal) => {
  if (!statusVal) return null;
  return CLAIM_STATUS_MAP[String(statusVal)] || 
         Object.values(CLAIM_STATUS_MAP).find(item => 
           [item.name, item.staffName, item.customerName].includes(statusVal)
         );
};

// ฟังก์ชันสำหรับหา status_id จากข้อความภาษาไทย
export const getStatusId = (statusVal) => {
  if (!statusVal) return null;
  // ถ้าเป็น ID ตัวเลขอยู่แล้วให้ส่งกลับได้เลย
  if (CLAIM_STATUS_MAP[String(statusVal)]) return String(statusVal);

  // ถ้าเป็นข้อความ ให้หา ID จาก key
  const foundKey = Object.keys(CLAIM_STATUS_MAP).find((key) => {
    const item = CLAIM_STATUS_MAP[key];
    return item.name === statusVal || item.staffName === statusVal || item.customerName === statusVal;
  });

  return foundKey || statusVal;
};

// 2. Helper Functions ดึงชื่อสถานะตาม Role และแปลงค่า fallback
export const getStatusName = (statusVal, role = "default") => {
  if (!statusVal) return "ไม่ระบุสถานะ";

  // ค้นหาจาก status_id ตัวเลข (เช่น 1, 2, "1")
  const targetObj = CLAIM_STATUS_MAP[String(statusVal)];
  if (targetObj) {
    if (role === "staff") return targetObj.staffName;
    if (role === "customer") return targetObj.customerName;
    return targetObj.name;
  }

  // หาก DB บันทึกมาเป็นข้อความภาษาไทยเดิม ค้นหาผ่านข้อความเดิมแล้วแมปเป็นชื่อของ role นั้นๆ
  const foundEntry = Object.values(CLAIM_STATUS_MAP).find(
    (item) => item.name === statusVal || item.staffName === statusVal || item.customerName === statusVal
  );

  if (foundEntry) {
    if (role === "staff") return foundEntry.staffName;
    if (role === "customer") return foundEntry.customerName;
    return foundEntry.name;
  }

  return String(statusVal);
};

export const getStatusColor = (statusVal) => {
  const targetObj = CLAIM_STATUS_MAP[String(statusVal)];
  if (targetObj) return targetObj.color;

  const foundEntry = Object.values(CLAIM_STATUS_MAP).find(
    (item) => item.name === statusVal || item.staffName === statusVal || item.customerName === statusVal
  );
  return foundEntry?.color || "default";
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


// 4. FILTER_OPTIONS สำหรับตัวกรองหน้า StaffClaimList
export const FILTER_OPTIONS = ["ทั้งหมด"].concat(Object.keys(STATUS_PRIORITY));

