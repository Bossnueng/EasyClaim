const path = require("path");
const fs = require("fs");
const { sql, connectDB } = require("../config/db");
const { uploadDir } = require("../middleware/uploadSignature");

const TABLE = "[dbo].[warehouse_signatures]";
const HISTORY_TABLE = "[dbo].[warehouse_signature_history]";

const CREATE_TABLE_SQL = `
IF OBJECT_ID(N'[dbo].[warehouse_signatures]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[warehouse_signatures] (
        signature_id   INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        warehouse      NVARCHAR(100) NOT NULL,
        reviewer_name  NVARCHAR(100) NULL,
        image_path     NVARCHAR(255) NOT NULL,
        updated_by     INT NULL,
        updated_at     DATETIME NOT NULL CONSTRAINT DF_warehouse_signatures_updated_at DEFAULT GETDATE()
    );
    CREATE UNIQUE INDEX UX_warehouse_signatures_warehouse
        ON [dbo].[warehouse_signatures] (warehouse);
END

IF OBJECT_ID(N'[dbo].[warehouse_signature_history]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[warehouse_signature_history] (
        history_id     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        warehouse      NVARCHAR(100) NOT NULL,
        reviewer_name  NVARCHAR(100) NULL,
        image_path     NVARCHAR(255) NULL,
        effective_from DATETIME NOT NULL CONSTRAINT DF_warehouse_signature_history_effective_from DEFAULT GETDATE(),
        created_by     INT NULL
    );
    CREATE INDEX IX_warehouse_signature_history_warehouse
        ON [dbo].[warehouse_signature_history] (warehouse, effective_from);
END

INSERT INTO [dbo].[warehouse_signature_history] (warehouse, reviewer_name, image_path, effective_from, created_by)
SELECT s.warehouse, s.reviewer_name, s.image_path, s.updated_at, s.updated_by
FROM [dbo].[warehouse_signatures] s
WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[warehouse_signature_history] h WHERE h.warehouse = s.warehouse
);
`;

let tableReady = null;

const ensureSignatureTable = async () => {
  if (!tableReady) {
    tableReady = (async () => {
      const pool = await connectDB();
      if (!pool) throw new Error("เชื่อมต่อฐานข้อมูลไม่ได้");
      await pool.request().query(CREATE_TABLE_SQL);
      console.log("✅ warehouse_signatures + warehouse_signature_history tables ready");
      return pool;
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
};

ensureSignatureTable().catch((err) => console.error("❌ warehouse_signatures init error:", err.message));

const getPool = async () => {
  await ensureSignatureTable();
  return connectDB();
};

const fileBaseUrl = (req) => process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

const withUrl = (req, row) => ({
  ...row,
  image_url: row.image_path ? `${fileBaseUrl(req)}${row.image_path}` : "",
});

const removeFileQuietly = (imagePath) => {
  if (!imagePath) return;
  try {
    const filePath = path.join(uploadDir, path.basename(imagePath));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn("ลบไฟล์ลายเซ็นเดิมไม่สำเร็จ:", err.message);
  }
};

const isAdminUser = async (pool, userId) => {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const result = await pool
    .request()
    .input("user_id", sql.Int, id)
    .query(`SELECT role_id FROM [dbo].[users] WHERE user_id = @user_id`);
  return Number(result.recordset[0]?.role_id) === 1;
};

exports.getWarehouseSignatures = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT signature_id, warehouse, reviewer_name, image_path, updated_by, updated_at
      FROM ${TABLE}
      ORDER BY warehouse ASC
    `);
    res.json({ status: true, data: result.recordset.map((r) => withUrl(req, r)) });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.getWarehouseSignatureHistory = async (req, res) => {
  try {
    const warehouse = String(req.query?.warehouse || "").trim();
    const pool = await getPool();
    const request = pool.request();
    let where = "";
    if (warehouse) {
      request.input("warehouse", sql.NVarChar(100), warehouse);
      where = "WHERE warehouse = @warehouse";
    }
    const result = await request.query(`
      SELECT history_id, warehouse, reviewer_name, image_path, effective_from, created_by
      FROM ${HISTORY_TABLE}
      ${where}
      ORDER BY warehouse ASC, effective_from ASC, history_id ASC
    `);
    res.json({ status: true, data: result.recordset.map((r) => withUrl(req, r)) });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

const runInTransaction = async (pool, work) => {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const result = await work(() => new sql.Request(tx));
    await tx.commit();
    return result;
  } catch (err) {
    try {
      await tx.rollback();
    } catch (rollbackErr) {
      console.warn("rollback ไม่สำเร็จ:", rollbackErr.message);
    }
    throw err;
  }
};

const insertHistory = (request, { warehouse, reviewerName, imagePath, createdBy }) =>
  request
    .input("h_warehouse", sql.NVarChar(100), warehouse)
    .input("h_reviewer_name", sql.NVarChar(100), reviewerName)
    .input("h_image_path", sql.NVarChar(255), imagePath)
    .input("h_created_by", sql.Int, Number.isInteger(Number(createdBy)) ? Number(createdBy) : null)
    .query(`
      INSERT INTO ${HISTORY_TABLE} (warehouse, reviewer_name, image_path, effective_from, created_by)
      VALUES (@h_warehouse, @h_reviewer_name, @h_image_path, GETDATE(), @h_created_by)
    `);

exports.saveWarehouseSignature = async (req, res) => {
  const newFilePath = req.file ? `/uploads/signatures/${req.file.filename}` : null;
  try {
    const warehouse = String(req.body.warehouse || "").trim();
    const reviewerName = String(req.body.reviewer_name || "").trim() || null;
    const updatedBy = req.body.updated_by;

    if (!warehouse) {
      removeFileQuietly(newFilePath);
      return res.status(400).json({ status: false, message: "กรุณาระบุคลังสินค้า" });
    }
    if (warehouse.length > 100 || (reviewerName && reviewerName.length > 100)) {
      removeFileQuietly(newFilePath);
      return res.status(400).json({ status: false, message: "ชื่อคลังหรือชื่อผู้สอบทานยาวเกิน 100 ตัวอักษร" });
    }

    const pool = await getPool();

    if (!(await isAdminUser(pool, updatedBy))) {
      removeFileQuietly(newFilePath);
      return res.status(400).json({ status: false, message: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น" });
    }

    const existing = await pool
      .request()
      .input("warehouse", sql.NVarChar(100), warehouse)
      .query(`SELECT signature_id, reviewer_name, image_path FROM ${TABLE} WHERE warehouse = @warehouse`);
    const current = existing.recordset[0];

    if (!current && !newFilePath) {
      return res.status(400).json({ status: false, message: "กรุณาแนบไฟล์ลายเซ็น" });
    }

    const imagePath = newFilePath || current?.image_path;
    const changed =
      !current || imagePath !== current.image_path || (reviewerName || null) !== (current.reviewer_name || null);

    await runInTransaction(pool, async (newRequest) => {
      const request = newRequest()
        .input("warehouse", sql.NVarChar(100), warehouse)
        .input("reviewer_name", sql.NVarChar(100), reviewerName)
        .input("image_path", sql.NVarChar(255), imagePath)
        .input("updated_by", sql.Int, Number(updatedBy));

      if (current) {
        await request.query(`
          UPDATE ${TABLE}
          SET reviewer_name = @reviewer_name,
              image_path = @image_path,
              updated_by = @updated_by,
              updated_at = GETDATE()
          WHERE warehouse = @warehouse
        `);
      } else {
        await request.query(`
          INSERT INTO ${TABLE} (warehouse, reviewer_name, image_path, updated_by, updated_at)
          VALUES (@warehouse, @reviewer_name, @image_path, @updated_by, GETDATE())
        `);
      }

      if (changed) {
        await insertHistory(newRequest(), { warehouse, reviewerName, imagePath, createdBy: updatedBy });
      }
    });

    const saved = await pool
      .request()
      .input("warehouse", sql.NVarChar(100), warehouse)
      .query(`
        SELECT signature_id, warehouse, reviewer_name, image_path, updated_by, updated_at
        FROM ${TABLE} WHERE warehouse = @warehouse
      `);

    res.json({
      status: true,
      message: current ? "อัปเดตลายเซ็นเรียบร้อยแล้ว" : "เพิ่มลายเซ็นเรียบร้อยแล้ว",
      data: saved.recordset[0] ? withUrl(req, saved.recordset[0]) : null,
    });
  } catch (error) {
    removeFileQuietly(newFilePath);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.delWarehouseSignature = async (req, res) => {
  try {
    const warehouse = String(req.body?.warehouse || "").trim();
    if (!warehouse) {
      return res.status(400).json({ status: false, message: "กรุณาระบุคลังสินค้า" });
    }

    const pool = await getPool();

    if (!(await isAdminUser(pool, req.body?.updated_by))) {
      return res.status(400).json({ status: false, message: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น" });
    }

    const found = await pool
      .request()
      .input("warehouse", sql.NVarChar(100), warehouse)
      .query(`SELECT image_path FROM ${TABLE} WHERE warehouse = @warehouse`);

    if (found.recordset.length === 0) {
      return res.status(400).json({ status: false, message: "ไม่พบลายเซ็นของคลังนี้" });
    }

    await runInTransaction(pool, async (newRequest) => {
      await newRequest()
        .input("warehouse", sql.NVarChar(100), warehouse)
        .query(`DELETE FROM ${TABLE} WHERE warehouse = @warehouse`);
      await insertHistory(newRequest(), {
        warehouse,
        reviewerName: null,
        imagePath: null,
        createdBy: req.body?.updated_by,
      });
    });

    res.json({ status: true, message: "ลบลายเซ็นเรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.ensureSignatureTable = ensureSignatureTable;
