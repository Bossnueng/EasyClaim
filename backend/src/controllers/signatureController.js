const path = require("path");
const fs = require("fs");
const { sql, connectDB } = require("../config/db");
const { uploadDir } = require("../middleware/uploadSignature");

const TABLE = "[EasyClaim_Dev].[dbo].[warehouse_signatures]";

const CREATE_TABLE_SQL = `
IF OBJECT_ID(N'[EasyClaim_Dev].[dbo].[warehouse_signatures]', N'U') IS NULL
BEGIN
    CREATE TABLE [EasyClaim_Dev].[dbo].[warehouse_signatures] (
        signature_id   INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        warehouse      NVARCHAR(100) NOT NULL,
        reviewer_name  NVARCHAR(100) NULL,
        image_path     NVARCHAR(255) NOT NULL,
        updated_by     INT NULL,
        updated_at     DATETIME NOT NULL CONSTRAINT DF_warehouse_signatures_updated_at DEFAULT GETDATE()
    );
    CREATE UNIQUE INDEX UX_warehouse_signatures_warehouse
        ON [EasyClaim_Dev].[dbo].[warehouse_signatures] (warehouse);
END
`;

let tableReady = null;

/** สร้างตารางครั้งแรก (ถ้าล้มเหลวจะลองใหม่ในคำขอถัดไป) */
const ensureSignatureTable = async () => {
  if (!tableReady) {
    tableReady = (async () => {
      const pool = await connectDB();
      if (!pool) throw new Error("เชื่อมต่อฐานข้อมูลไม่ได้");
      await pool.request().query(CREATE_TABLE_SQL);
      console.log("✅ warehouse_signatures table ready");
      return pool;
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
};

// เตรียมตารางตั้งแต่เริ่ม server (ไม่ให้ server ล่มถ้า DB ยังไม่พร้อม)
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

/** ตรวจว่าเป็นผู้ดูแลระบบ (role_id = 1) */
const isAdminUser = async (pool, userId) => {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const result = await pool
    .request()
    .input("user_id", sql.Int, id)
    .query(`SELECT role_id FROM [EasyClaim_Dev].[dbo].[users] WHERE user_id = @user_id`);
  return Number(result.recordset[0]?.role_id) === 1;
};

// GET /getWarehouseSignatures
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

// POST /warehouseSignature (multipart: warehouse, reviewer_name, updated_by, file)
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
      .query(`SELECT signature_id, image_path FROM ${TABLE} WHERE warehouse = @warehouse`);
    const current = existing.recordset[0];

    if (!current && !newFilePath) {
      return res.status(400).json({ status: false, message: "กรุณาแนบไฟล์ลายเซ็น" });
    }

    const request = pool
      .request()
      .input("warehouse", sql.NVarChar(100), warehouse)
      .input("reviewer_name", sql.NVarChar(100), reviewerName)
      .input("image_path", sql.NVarChar(255), newFilePath || current?.image_path)
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
      // เปลี่ยนรูปใหม่ → ลบไฟล์เดิม
      if (newFilePath && current.image_path && current.image_path !== newFilePath) {
        removeFileQuietly(current.image_path);
      }
    } else {
      await request.query(`
        INSERT INTO ${TABLE} (warehouse, reviewer_name, image_path, updated_by, updated_at)
        VALUES (@warehouse, @reviewer_name, @image_path, @updated_by, GETDATE())
      `);
    }

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

// DELETE /delWarehouseSignature  body: { warehouse, updated_by }
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
      // ใช้ 400 (ไม่ใช่ 404) เพราะ frontend ถือว่า 404 = ยังไม่มี API
      return res.status(400).json({ status: false, message: "ไม่พบลายเซ็นของคลังนี้" });
    }

    await pool
      .request()
      .input("warehouse", sql.NVarChar(100), warehouse)
      .query(`DELETE FROM ${TABLE} WHERE warehouse = @warehouse`);

    removeFileQuietly(found.recordset[0].image_path);

    res.json({ status: true, message: "ลบลายเซ็นเรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.ensureSignatureTable = ensureSignatureTable;
