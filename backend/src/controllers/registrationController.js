// =====================================================================
// สมัครใช้งานผ่านหน้าเว็บ + admin อนุมัติ
//   POST /register              ผู้ใช้สมัครเอง → status PENDING (ยัง login ไม่ได้)
//   GET  /users/pending-count   จำนวนที่รออนุมัติ (แสดงตัวเลขบนเมนู admin)
//   PUT  /users/:id/approve     admin อนุมัติ + กำหนด role และ agent → status ใช้งาน
//   PUT  /users/:id/reject      admin ไม่อนุมัติ → status REJECTED
// =====================================================================
const { sql, connectDB } = require("../config/db");
const bcrypt = require("bcrypt");
const { USER_STATUS, isPendingStatus, isRejectedStatus } = require("../utils/userStatus");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// รหัสพนักงาน: ตัวเลขล้วน (เช่น 70133984)
const EMPLOYEE_ID_RE = /^\d{4,12}$/;
// username ของคนนอก: a-z 0-9 . _ - ยาว 4-50 และต้องมีตัวอักษรอย่างน้อย 1 ตัว
// (ห้ามเป็นตัวเลขล้วน จะได้ไม่ชนกับรูปแบบรหัสพนักงาน)
const EXTERNAL_USERNAME_RE = /^(?=.*[A-Za-z])[A-Za-z0-9._-]{4,50}$/;
// role_id เป็น NOT NULL — ใส่ role ลูกค้าไว้ชั่วคราว admin เลือก role จริงตอนอนุมัติ
const REGISTER_PLACEHOLDER_ROLE_ID = 2;
const MIN_PASSWORD_LENGTH = 8;

// ไม่มีคอลัมน์ประเภทผู้ใช้แยก — ดูจาก username: ตัวเลขล้วน = พนักงาน (รหัสพนักงาน), มีตัวอักษร = บุคคลภายนอก
const USER_TYPE = { EMPLOYEE: "employee", EXTERNAL: "external" };

const bad = (res, message) => res.status(400).json({ status: false, message });

// POST /register
//   พนักงาน : { user_type: "employee", employee_id, full_name, password, email?, phone? }  → username = รหัสพนักงาน
//   คนนอก   : { user_type: "external", username,    full_name, password, email,  phone? }  → username ตั้งเอง
exports.register = async (req, res) => {
  try {
    const user_type = String(req.body.user_type ?? "").trim();
    const full_name = String(req.body.full_name ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const phone = String(req.body.phone ?? "").trim();
    const password = String(req.body.password ?? "");

    let username;
    if (user_type === USER_TYPE.EMPLOYEE) {
      username = String(req.body.employee_id ?? "").trim();
      if (!EMPLOYEE_ID_RE.test(username)) return bad(res, "รหัสพนักงานต้องเป็นตัวเลข 4-12 หลัก");
    } else if (user_type === USER_TYPE.EXTERNAL) {
      username = String(req.body.username ?? "").trim();
      if (!EXTERNAL_USERNAME_RE.test(username)) {
        return bad(res, "ชื่อผู้ใช้ต้องยาว 4-50 ตัว ใช้ได้ a-z 0-9 . _ - และต้องมีตัวอักษรอย่างน้อย 1 ตัว");
      }
      if (!email) return bad(res, "บุคคลภายนอกต้องกรอกอีเมล");
    } else {
      return bad(res, "กรุณาเลือกว่าเป็นพนักงานบริษัท หรือบุคคลภายนอก");
    }

    if (!full_name || full_name.length > 200) return bad(res, "กรุณากรอกชื่อ-นามสกุล (ไม่เกิน 200 ตัวอักษร)");
    if (email && (!EMAIL_RE.test(email) || email.length > 150)) return bad(res, "รูปแบบอีเมลไม่ถูกต้อง");
    if (phone.length > 20) return bad(res, "เบอร์โทรศัพท์ยาวเกิน 20 ตัวอักษร");
    if (password.length < MIN_PASSWORD_LENGTH) return bad(res, `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);

    const pool = await connectDB();

    // login ใช้ได้ทั้ง username และ email จึงห้ามซ้ำข้ามกันด้วย (username ของคนหนึ่ง = email ของอีกคน)
    const dup = await pool
      .request()
      .input("username", sql.NVarChar(150), username)
      .input("email", sql.NVarChar(150), email || null)
      .query(`
        SELECT username, email FROM users
        WHERE username = @username OR email = @username
           OR (@email IS NOT NULL AND (username = @email OR email = @email))
        LIMIT 1
      `);
    if (dup.recordset.length > 0) {
      const row = dup.recordset[0];
      const sameUser = [row.username, row.email].some((v) => String(v || "").toLowerCase() === username.toLowerCase());
      if (sameUser) {
        return res.status(409).json({
          status: false,
          message:
            user_type === USER_TYPE.EMPLOYEE
              ? "รหัสพนักงานนี้มีบัญชีอยู่แล้ว หากลืมรหัสผ่านกรุณาติดต่อผู้ดูแลระบบ"
              : "ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาตั้งชื่ออื่น",
        });
      }
      return res.status(409).json({ status: false, message: "อีเมลนี้ถูกใช้แล้ว" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool
      .request()
      .input("username", sql.NVarChar(150), username)
      .input("password_hash", sql.NVarChar(255), password_hash)
      .input("full_name", sql.NVarChar(200), full_name)
      .input("email", sql.NVarChar(150), email || null)
      .input("phone", sql.NVarChar(20), phone || null)
      .input("role_id", sql.Int, REGISTER_PLACEHOLDER_ROLE_ID)
      .input("status", sql.NVarChar(20), USER_STATUS.PENDING)
      .query(`
        INSERT INTO users
        (username, password_hash, full_name, email, phone, role_id, status, created_at, updated_at)
        VALUES (@username, @password_hash, @full_name, @email, @phone, @role_id, @status, NOW(), NOW());

        SELECT LAST_INSERT_ID() AS user_id;
      `);

    const io = req.app.get("io");
    if (io) io.emit("user:registered", { user_id: result.recordset[0]?.user_id });

    res.status(201).json({
      status: true,
      message: "สมัครใช้งานเรียบร้อย กรุณารอผู้ดูแลระบบอนุมัติก่อนเข้าใช้งาน",
      username,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ status: false, message: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว" });
    }
    if (error.code === "ER_DATA_TOO_LONG") {
      return bad(res, "ข้อมูลยาวเกินกำหนด");
    }
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.getPendingCount = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("pending", sql.NVarChar(20), USER_STATUS.PENDING)
      .query(`SELECT COUNT(*) AS pending FROM users WHERE UPPER(status) = @pending`);
    res.json({ status: true, pending: Number(result.recordset[0]?.pending || 0) });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

const findUser = async (pool, user_id) => {
  const result = await pool
    .request()
    .input("user_id", sql.Int, user_id)
    .query(`SELECT user_id, status FROM users WHERE user_id = @user_id`);
  return result.recordset[0] || null;
};

exports.approveUser = async (req, res) => {
  const user_id = Number(req.params.id);
  const role_id = Number(req.body.role_id);
  const agent_ids = Array.isArray(req.body.agent_ids)
    ? [...new Set(req.body.agent_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    : [];

  if (!Number.isInteger(user_id) || user_id <= 0) {
    return res.status(400).json({ status: false, message: "user_id ไม่ถูกต้อง" });
  }
  if (!Number.isInteger(role_id) || role_id <= 0) {
    return res.status(400).json({ status: false, message: "กรุณาเลือกสิทธิ์ (Role)" });
  }

  let tx = null;
  try {
    const pool = await connectDB();

    const user = await findUser(pool, user_id);
    if (!user) return res.status(404).json({ status: false, message: "ไม่พบผู้ใช้" });
    if (!isPendingStatus(user.status) && !isRejectedStatus(user.status)) {
      return res.status(409).json({ status: false, message: "ผู้ใช้นี้ไม่ได้อยู่ในสถานะรออนุมัติ" });
    }

    const role = await pool
      .request()
      .input("role_id", sql.Int, role_id)
      .query(`SELECT role_id FROM roles WHERE role_id = @role_id`);
    if (role.recordset.length === 0) {
      return res.status(400).json({ status: false, message: "ไม่พบสิทธิ์ (Role) ที่เลือก" });
    }

    tx = new sql.Transaction(pool);
    await tx.begin();

    await tx
      .request()
      .input("user_id", sql.Int, user_id)
      .input("role_id", sql.Int, role_id)
      .input("status", sql.NVarChar(20), USER_STATUS.ACTIVE)
      .query(`UPDATE users SET status = @status, role_id = @role_id, updated_at = NOW() WHERE user_id = @user_id`);

    await tx
      .request()
      .input("user_id", sql.Int, user_id)
      .query(`DELETE FROM user_agents WHERE user_id = @user_id`);

    for (const agent_id of agent_ids) {
      await tx
        .request()
        .input("user_id", sql.Int, user_id)
        .input("agent_id", sql.Int, agent_id)
        .query(`INSERT INTO user_agents (user_id, agent_id) VALUES (@user_id, @agent_id)`);
    }

    await tx.commit();
    tx = null;

    const io = req.app.get("io");
    if (io) io.emit("user:updated", { user_id, agent_ids });

    res.json({ status: true, message: "อนุมัติผู้ใช้งานเรียบร้อย", user_id });
  } catch (error) {
    if (tx) {
      try {
        await tx.rollback();
      } catch (rollbackErr) {
        console.warn("rollback ไม่สำเร็จ:", rollbackErr.message);
      }
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ status: false, message: "ไม่พบ Agent ที่เลือก" });
    }
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const user_id = Number(req.params.id);
    if (!Number.isInteger(user_id) || user_id <= 0) {
      return res.status(400).json({ status: false, message: "user_id ไม่ถูกต้อง" });
    }

    const pool = await connectDB();
    const user = await findUser(pool, user_id);
    if (!user) return res.status(404).json({ status: false, message: "ไม่พบผู้ใช้" });
    if (!isPendingStatus(user.status)) {
      return res.status(409).json({ status: false, message: "ผู้ใช้นี้ไม่ได้อยู่ในสถานะรออนุมัติ" });
    }

    await pool
      .request()
      .input("user_id", sql.Int, user_id)
      .input("status", sql.NVarChar(20), USER_STATUS.REJECTED)
      .query(`UPDATE users SET status = @status, updated_at = NOW() WHERE user_id = @user_id`);

    res.json({ status: true, message: "ไม่อนุมัติผู้ใช้งานเรียบร้อย", user_id });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
