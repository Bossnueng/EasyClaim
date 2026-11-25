/*==================================
ฐานข้อมูล: MySQL / MariaDB (driver mysql2)

เดิมใช้ SQL Server (mssql) — ไฟล์นี้จำลอง API ของ mssql ที่โค้ดเดิมใช้อยู่ไว้ให้เหมือนเดิม
controller จึงยังเขียนแบบเดิมได้:

  const pool = await connectDB();
  const result = await pool.request()
    .input("user_id", sql.Int, 1)
    .query("SELECT * FROM users WHERE user_id = @user_id");
  result.recordset      // แถวของ SELECT แรก
  result.rowsAffected   // จำนวนแถวที่โดนแต่ละคำสั่ง
  result.insertId       // id ล่าสุดจาก INSERT

  const tx = new sql.Transaction(pool);
  await tx.begin();
  await tx.request().input(...).query(...);   // หรือ new sql.Request(tx)
  await tx.commit();                          // หรือ tx.rollback()

ตัวแปรในคำสั่ง SQL ยังใช้ @ชื่อ เหมือนเดิม (ระบบแปลงเป็น ? และ escape ค่าให้)
แต่ตัวคำสั่ง SQL ต้องเป็นของ MySQL: NOW() แทน GETDATE(), LAST_INSERT_ID() แทน SCOPE_IDENTITY(),
ไม่มี [dbo]. / [วงเล็บเหลี่ยม] / WITH(NOLOCK)
==================================*/

const mysql = require("mysql2/promise");
require("dotenv").config();

const config = {
  host: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  // INSERT ...; SELECT LAST_INSERT_ID() ในคำสั่งเดียว (แบบเดียวกับ SCOPE_IDENTITY เดิม)
  multipleStatements: true,
  // ให้ DECIMAL กลับมาเป็น number เหมือน mssql (ไม่ใช่ string)
  decimalNumbers: true,
  // เก็บ/อ่านวันที่เป็นเวลาท้องถิ่นของ server (TZ=Asia/Bangkok) เหมือน useUTC: false เดิม
  timezone: "local",
  charset: "utf8mb4",
  // คอลัมน์ที่เดิมเป็น BIT ใน SQL Server (agents.status, items.status, claim_approves.approve_status)
  // ใน MySQL เป็น TINYINT(1) — แปลงกลับเป็น true/false ให้หน้าเว็บได้ค่าเหมือนเดิม
  typeCast: (field, next) => {
    if (field.type === "TINY" && field.length === 1) {
      const value = field.string();
      return value === null ? null : value === "1";
    }
    return next();
  },
};

let rawPool = null;

const getRawPool = () => {
  if (!rawPool) {
    rawPool = mysql.createPool(config);
  }
  return rawPool;
};

// ---------- ชนิดข้อมูล (ใช้แค่ให้โค้ดเดิมเรียกได้ — mysql2 escape ค่าตามชนิด JS เอง) ----------
const makeType = (name) => {
  const type = () => type;
  type.typeName = name;
  return type;
};

const TYPE_NAMES = [
  "Int", "BigInt", "SmallInt", "TinyInt", "Bit",
  "Decimal", "Numeric", "Float", "Real", "Money",
  "VarChar", "NVarChar", "Char", "NChar", "Text", "NText",
  "Date", "DateTime", "DateTime2", "SmallDateTime", "Time",
  "UniqueIdentifier", "VarBinary",
];

// ---------- แปลง @param เป็น ? ----------
const stripLineComments = (text) => text.replace(/--[^\r\n]*/g, "");

const compile = (text, params) => {
  const values = [];
  const sqlText = stripLineComments(text).replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) {
      throw new Error(`ไม่ได้ส่งค่าให้ตัวแปร @${name} ในคำสั่ง SQL`);
    }
    values.push(params[name]);
    return "?";
  });
  return { sqlText, values };
};

const normalizeValue = (value) => {
  if (value === undefined) return null;
  if (typeof value === "number" && Number.isNaN(value)) return null;
  return value;
};

// ---------- แปลงผลลัพธ์ mysql2 ให้หน้าตาเหมือน mssql ----------
const isResultHeader = (r) =>
  r && !Array.isArray(r) && typeof r === "object" && r.constructor && r.constructor.name === "ResultSetHeader";

const toMssqlResult = (results) => {
  const isMulti = Array.isArray(results) && results.some((r) => Array.isArray(r) || isResultHeader(r));
  const statements = isMulti ? results : [results];

  const recordsets = statements.filter((r) => Array.isArray(r));
  const headers = statements.filter(isResultHeader);
  const lastInsert = headers.filter((h) => h.insertId).pop();

  return {
    recordset: recordsets[0] || [],
    recordsets,
    rowsAffected: statements.map((r) => (Array.isArray(r) ? r.length : r.affectedRows)),
    insertId: lastInsert ? lastInsert.insertId : null,
  };
};

// ---------- Request / Transaction ----------
class Request {
  constructor(parent) {
    this._parent = parent || null;
    this._params = {};
  }

  input(name, type, value) {
    this._params[name] = normalizeValue(arguments.length === 2 ? type : value);
    return this;
  }

  async query(text) {
    const { sqlText, values } = compile(text, this._params);
    let executor;
    if (this._parent instanceof Transaction) {
      if (!this._parent._conn) throw new Error("Transaction ยังไม่ได้ begin()");
      executor = this._parent._conn;
    } else {
      executor = getRawPool();
    }
    const [results] = await executor.query(sqlText, values);
    return toMssqlResult(results);
  }
}

class Transaction {
  constructor() {
    this._conn = null;
  }

  async begin() {
    if (this._conn) throw new Error("Transaction เริ่มไปแล้ว");
    this._conn = await getRawPool().getConnection();
    try {
      await this._conn.beginTransaction();
    } catch (err) {
      this._release();
      throw err;
    }
    return this;
  }

  request() {
    return new Request(this);
  }

  async commit() {
    if (!this._conn) throw new Error("Transaction ยังไม่ได้ begin()");
    try {
      await this._conn.commit();
    } finally {
      this._release();
    }
  }

  async rollback() {
    if (!this._conn) throw new Error("Transaction ยังไม่ได้ begin()");
    try {
      await this._conn.rollback();
    } finally {
      this._release();
    }
  }

  _release() {
    if (this._conn) {
      this._conn.release();
      this._conn = null;
    }
  }
}

const pool = {
  request: () => new Request(null),
};

const sql = { Request, Transaction, MAX: -1 };
for (const name of TYPE_NAMES) sql[name] = makeType(name);

const connectDB = async () => pool;

// ใช้ตอนเริ่มระบบ / health check: ลองต่อฐานข้อมูลจริง
const pingDB = async () => {
  const conn = await getRawPool().getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
};

module.exports = {
  connectDB,
  pingDB,
  sql,
};
