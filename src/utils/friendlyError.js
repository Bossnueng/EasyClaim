const FIELD_LABELS = {
  full_name: "ชื่อ-นามสกุล",
  username: "Username",
  password: "รหัสผ่าน",
  password_hash: "รหัสผ่าน",
  email: "อีเมล",
  phone: "เบอร์โทรศัพท์",
  role_id: "สิทธิ์การใช้งาน (Role)",
  role_name: "ชื่อสิทธิ์ (Role)",
  agent_id: "Agent",
  agent_code: "รหัส Agent",
  agent_name: "ชื่อ Agent",
  claim_no: "เลขที่เคลม",
  claim_id: "รายการเคลม",
  item_id: "สินค้า",
  driver_id: "รหัส พขร.",
  truck_plate: "ทะเบียนรถ",
  warehouse: "คลังสินค้า",
  reviewer_name: "ชื่อผู้สอบทาน",
  image_path: "ไฟล์รูปภาพ",
  status: "สถานะ",
  remark: "หมายเหตุ",
};

const fieldLabel = (name) => FIELD_LABELS[String(name || "").toLowerCase()] || name || "บางช่อง";

const GENERIC_TITLE = "ดำเนินการไม่สำเร็จ";

const toText = (input) => {
  if (input === null || input === undefined) return "";
  if (typeof input === "string") return input;
  if (input instanceof Error) return input.message || "";
  if (typeof input === "object") {
    if (typeof input.message === "string") return input.message;
    if (typeof input.error === "string") return input.error;
    try {
      return JSON.stringify(input);
    } catch {
      return "";
    }
  }
  return String(input);
};

const splitContext = (text) => {
  const match = text.match(/^([^:\n]{2,60}?)\s*:\s*([\s\S]+)$/);
  if (match && /[฀-๿]/.test(match[1]) && !/https?$/i.test(match[1])) {
    return { context: match[1].trim(), raw: match[2].trim() };
  }
  return { context: "", raw: text.trim() };
};

const isMostlyThai = (text) => /[฀-๿]/.test(text) && !/[A-Za-z]{4,}.*[A-Za-z]{4,}.*[A-Za-z]{4,}/.test(text);

const RULES = [
  {
    test: /Cannot insert the value NULL into column '([^']+)'/i,
    build: (m) => ({
      description: `ยังไม่ได้กรอก "${fieldLabel(m[1])}" ซึ่งเป็นข้อมูลที่จำเป็น`,
      hint: `กรุณากรอก "${fieldLabel(m[1])}" แล้วกดบันทึกอีกครั้ง`,
    }),
  },
  {
    test: /(?:Violation of (?:UNIQUE KEY|PRIMARY KEY) constraint|Cannot insert duplicate key)/i,
    build: (m, raw) => {
      const value = raw.match(/duplicate key value is \(([^)]*)\)/i)?.[1];
      return {
        description: value ? `ข้อมูล "${value}" มีอยู่ในระบบแล้ว ไม่สามารถบันทึกซ้ำได้` : "ข้อมูลนี้มีอยู่ในระบบแล้ว ไม่สามารถบันทึกซ้ำได้",
        hint: "ตรวจสอบว่ามีรายการนี้อยู่แล้วหรือไม่ หรือเปลี่ยนเป็นค่าอื่นที่ไม่ซ้ำ",
      };
    },
  },
  {
    test: /(?:DELETE statement conflicted|conflicted with the REFERENCE constraint)/i,
    build: () => ({
      description: "ลบไม่ได้ เพราะข้อมูลนี้ยังถูกใช้งานอยู่ในรายการอื่น",
      hint: "ลบหรือย้ายรายการที่เกี่ยวข้องออกก่อน แล้วลองอีกครั้ง",
    }),
  },
  {
    test: /(?:INSERT|UPDATE) statement conflicted with the FOREIGN KEY constraint/i,
    build: () => ({
      description: "ข้อมูลที่เลือกอ้างอิงถึงรายการที่ไม่มีอยู่ในระบบ",
      hint: "รีเฟรชหน้าแล้วเลือกข้อมูลใหม่อีกครั้ง",
    }),
  },
  {
    test: /String or binary data would be truncated(?:[\s\S]*?column '([^']+)')?/i,
    build: (m) => ({
      description: m[1] ? `ข้อมูล "${fieldLabel(m[1])}" ยาวเกินกว่าที่ระบบรองรับ` : "ข้อมูลบางช่องยาวเกินกว่าที่ระบบรองรับ",
      hint: "ลดความยาวของข้อความแล้วลองบันทึกอีกครั้ง",
    }),
  },
  {
    test: /(?:Conversion failed|Error converting data type|Validation failed for parameter|Invalid number|is not a valid)/i,
    build: () => ({
      description: "ข้อมูลบางช่องมีรูปแบบไม่ถูกต้อง",
      hint: "ตรวจสอบตัวเลข วันที่ และข้อมูลที่กรอก แล้วลองอีกครั้ง",
    }),
  },
  {
    test: /(?:Failed to connect to|ConnectionError|Login failed for user|ETIMEOUT|ESOCKET|connection is closed)/i,
    build: () => ({
      description: "ระบบหลังบ้านเชื่อมต่อฐานข้อมูลไม่ได้ในขณะนี้",
      hint: "ลองใหม่อีกครั้งในอีกสักครู่ หากยังไม่ได้ กรุณาแจ้งผู้ดูแลระบบ",
    }),
  },
  {
    test: /(?:Network Error|ERR_NETWORK|Failed to fetch|ERR_CONNECTION_REFUSED)/i,
    build: () => ({
      description: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้",
      hint: "ตรวจสอบอินเทอร์เน็ต แล้วลองใหม่ หากยังไม่ได้ ระบบหลังบ้านอาจปิดอยู่ กรุณาแจ้งผู้ดูแลระบบ",
    }),
  },
  {
    test: /(?:timeout of \d+ms exceeded|ECONNABORTED|timed? ?out)/i,
    build: () => ({
      description: "เซิร์ฟเวอร์ตอบกลับช้าเกินไป",
      hint: "รอสักครู่แล้วลองใหม่อีกครั้ง",
    }),
  },
  {
    test: /(?:File too large|LIMIT_FILE_SIZE|Request Entity Too Large|status code 413)/i,
    build: () => ({
      description: "ไฟล์มีขนาดใหญ่เกินกว่าที่ระบบรองรับ",
      hint: "ลดขนาดไฟล์หรือเลือกไฟล์อื่น แล้วลองอีกครั้ง",
    }),
  },
  {
    test: /status code (\d{3})/i,
    build: (m) => {
      const code = Number(m[1]);
      if (code === 400) return { description: "ข้อมูลที่ส่งไม่ถูกต้องหรือไม่ครบถ้วน", hint: "ตรวจสอบข้อมูลที่กรอก แล้วลองอีกครั้ง" };
      if (code === 404) return { description: "ไม่พบข้อมูลหรือบริการที่ต้องการ", hint: "รีเฟรชหน้าแล้วลองใหม่ หากยังไม่ได้ กรุณาแจ้งผู้ดูแลระบบ" };
      if (code >= 500) return { description: "ระบบหลังบ้านขัดข้องชั่วคราว", hint: "ลองใหม่อีกครั้งในอีกสักครู่ หากยังไม่ได้ กรุณาแจ้งผู้ดูแลระบบ" };
      return { description: "ระบบตอบกลับด้วยข้อผิดพลาด", hint: "ลองใหม่อีกครั้ง หากยังไม่ได้ กรุณาแจ้งผู้ดูแลระบบ" };
    },
  },
];

export const toFriendlyError = (input, fallbackTitle = GENERIC_TITLE) => {
  const text = toText(input).trim();
  const { context, raw } = splitContext(text);
  const title = context || fallbackTitle;

  if (!raw || raw === "[object Object]" || raw === "undefined" || raw === "null") {
    return { title, description: "เกิดข้อผิดพลาดที่ไม่คาดคิด", hint: "ลองใหม่อีกครั้ง หากยังไม่ได้ กรุณาแจ้งผู้ดูแลระบบ", detail: "" };
  }

  for (const rule of RULES) {
    const m = raw.match(rule.test);
    if (m) {
      const built = rule.build(m, raw);
      return { title, description: built.description, hint: built.hint || "", detail: raw };
    }
  }

  if (context && raw.length <= 40 && !/\s/.test(raw)) {
    return { title: `${context}: ${raw}`, description: "", hint: "", detail: "" };
  }

  if (isMostlyThai(raw)) {
    return { title: context ? title : raw, description: context ? raw : "", hint: "", detail: "" };
  }

  return {
    title,
    description: "เกิดข้อผิดพลาดที่ไม่คาดคิด",
    hint: "ลองใหม่อีกครั้ง หากยังไม่ได้ กรุณาแจ้งผู้ดูแลระบบพร้อมรายละเอียดด้านล่าง",
    detail: raw,
  };
};
