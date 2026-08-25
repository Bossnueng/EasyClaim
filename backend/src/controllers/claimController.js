const { sql, connectDB } = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🟢 1. ตั้งค่าการจัดเก็บไฟล์ภาพลงเครื่อง Server
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/claims";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

exports.upload = multer({ storage: storage });



exports.getclaimstatuslog = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .query(`
                SELECT [log_id]
                      ,[claim_id]
                      ,[status]
                      ,[remark]
                      ,[update_by]
                      ,[update_date]
                FROM [EasyClaim_Dev].[dbo].[claim_status_logs]
            `);

        res.json({
            status: true,
            data: result.recordset
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

exports.createClaimStatusLogs = async (req, res) => {
    try {
        const { claim_id, status, remark, update_by } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("claim_id", sql.NVarChar, claim_id)
            .input("status", sql.NVarChar, status)
            .input("remark", sql.NVarChar, remark)
            .input("update_by", sql.Int, update_by)
            .query(`
                INSERT INTO [EasyClaim_Dev].[dbo].[claim_status_logs]
                (
                    claim_id,
                    status,
                    remark,
                    update_by,
                    update_date
                )
                VALUES
                (
                    @claim_id,
                    @status,
                    @remark,
                    @update_by,
                    GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS log_id;
            `);
            
        res.json({
            status: true,
            message: "Insert Success",
            log_id: result.recordset[0].log_id
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

exports.createClaimimage = async (req, res) => {
    try {
        const claim_id = req.body.claim_id;
        const image_type = req.body.image_type || "CLAIM_ATTACHMENT";
        
        // เช็กว่ามีไฟล์ถูกอัปโหลดเข้ามาหรือไม่
        if (!req.file) {
        return res.status(400).json({ status: false, message: "กรุณาแนบไฟล์รูปภาพ" });
        }

        // สร้าง Path สั้นๆ เก็บลง DB เช่น /uploads/claims/171234567-890.jpg (ยาวไม่เกิน 50 ตัวอักษร)
        const image_path = `/uploads/claims/${req.file.filename}`;
        
        const pool = await connectDB();
        const result = await pool.request()
            .input("claim_id", sql.Int, claim_id)
            .input("image_path", sql.VarChar, image_path)
            .input("image_type", sql.VarChar, image_type)
            .query(`
                INSERT INTO [EasyClaim_Dev].[dbo].[claim_images]
                (
                    claim_id,
                    image_path,
                    image_type,
                    created_at
                )
                VALUES
                (
                    @claim_id,
                    @image_path,
                    @image_type,
                    GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS image_id;
            `);
            
        res.json({
            status: true,
            message: "Insert Success",
            image_id: result.recordset[0].image_id,
            image_path: image_path,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

exports.deleteClaimimage = async (req, res) => {
    try {
        const { image_id } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("image_id", sql.Int, image_id)
            .query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[claim_images]
                WHERE image_id = @image_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: false,
                message: "Image not found"
            });
        }

        res.json({
            status: true,
            message: "Delete Success"
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

exports.delClaimImages = async (req, res) => {
    try {
        const { image_ids } = req.body;

        if (!Array.isArray(image_ids) || image_ids.length === 0) {
            return res.status(400).json({
                status: false,
                message: "กรุณาส่ง image_ids เป็น Array"
            });
        }

        const pool = await connectDB();
        const request = pool.request();

        const params = image_ids.map((id, index) => {
            request.input(`id${index}`, sql.Int, id);
            return `@id${index}`;
        });

        const result = await request.query(`
            DELETE FROM [EasyClaim_Dev].[dbo].[claim_images]
            WHERE image_id IN (${params.join(",")})
        `);

        res.json({
            status: true,
            message: "Delete Success",
            deleted: result.rowsAffected[0]
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

exports.getclaimapproves = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .query(`
                SELECT [approve_id]
                      ,[claim_id]
                      ,[approve_by]
                      ,[approve_status]
                      ,[approve_remark]
                      ,[approve_date]
                FROM [EasyClaim_Dev].[dbo].[claim_approves]
            `);

        res.json({
            status: true,
            data: result.recordset
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

exports.createClaimapproves = async (req, res) => {
    try {
        const { claim_id, approve_by, approve_status, approve_remark } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("claim_id", sql.Int, claim_id)
            .input("approve_by", sql.VarChar, approve_by)
            .input("approve_status", sql.VarChar, approve_status)
            .input("approve_remark", sql.VarChar, approve_remark)
            .query(`
                INSERT INTO [EasyClaim_Dev].[dbo].[claim_approves]
                (
                    claim_id,
                    approve_by,
                    approve_status,
                    approve_remark,
                    approve_date
                )
                VALUES
                (
                    @claim_id,
                    @approve_by,
                    @approve_status,
                    @approve_remark,
                    GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS approve_id;
            `);
            
        res.json({
            status: true,
            message: "Insert Success",
            approve_id: result.recordset[0].approve_id
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

exports.delClaimApprove = async (req, res) => {
    try {
        const { approve_id } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("approve_id", sql.Int, approve_id)
            .query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[claim_approves]
                WHERE approve_id = @approve_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: false,
                message: "Approve not found"
            });
        }

        res.json({
            status: true,
            message: "Delete Success"
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

// 🟢 แก้ไขใน claimController.js
exports.getClaimByAgent = async (req, res) => {
    try {
        // เปลี่ยนจาก req.query เป็น req.params เพื่อรับค่าจาก URL Path /:agent_id
        const { agent_id } = req.params; 
        
        const pool = await connectDB();
        const result = await pool.request()
            .input("agent_id", sql.Int, agent_id) // หรือ sql.NVarChar ตามประเภทข้อมูลใน DB
            .query(`
                SELECT [claim_id]
                      ,[claim_no]
                      ,[agent_id]
                      ,[claim_date]
                      ,[item_id]
                      ,[lot_no]
                      ,[mfg_date]
                      ,[expire_date]
                      ,[qty]
                      ,[remark]
                      ,[current_status]
                      ,[driver_receive_date]
                      ,[warehouse_receive_date]
                      ,[approve_date]
                      ,[delivery_date]
                      ,[receive_finish_date]
                      ,[created_by]
                      ,[created_at]
                      ,[updated_at]
                FROM [EasyClaim_Dev].[dbo].[claims]
                WHERE agent_id = @agent_id
                ORDER BY [claim_id] DESC
            `);

        res.json({
            status: true,
            data: result.recordset
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

exports.getClaim = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .query(`
                SELECT [claim_id]
                      ,[claim_no]
                      ,[agent_id]
                      ,[claim_date]
                      ,[item_id]
                      ,[lot_no]
                      ,[mfg_date]
                      ,[expire_date]
                      ,[qty]
                      ,[remark]
                      ,[current_status]
                      ,[driver_receive_date]
                      ,[warehouse_receive_date]
                      ,[approve_date]
                      ,[delivery_date]
                      ,[receive_finish_date]
                      ,[created_by]
                      ,[created_at]
                      ,[updated_at]
                FROM [EasyClaim_Dev].[dbo].[claims]
                ORDER BY [claim_id] DESC
            `);

        res.json({
            status: true,
            data: result.recordset
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

exports.creartClaim = async (req, res) => {
    try {
        const {
            agent_id,
            item_id,
            lot_no,
            mfg_date,
            expire_date,
            qty,
            remark,
            current_status,
            driver_receive_date,
            warehouse_receive_date,
            approve_date,
            delivery_date,
            receive_finish_date,
            created_by
        } = req.body;

        const qtychang = 0;
        const pool = await connectDB();

        // 1. สร้าง Prefix จากวันที่ปัจจุบัน (รูปแบบ YYMMDD เช่น 260824)
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const datePrefix = `CLM${yy}${mm}${dd}`;

        // 2. Query หา claim_no ล่าสุดของวันนี้เพื่อนำมารัน Running Number ต่อ
        const lastClaimResult = await pool.request()
            .input("datePrefix", sql.VarChar, `${datePrefix}%`)
            .query(`
                SELECT TOP 1 claim_no 
                FROM [EasyClaim_Dev].[dbo].[claims] 
                WHERE claim_no LIKE @datePrefix 
                ORDER BY claim_id DESC
            `);

        let nextSeq = 1;
        if (lastClaimResult.recordset.length > 0) {
            const lastClaimNo = lastClaimResult.recordset[0].claim_no;
            const lastSeq = parseInt(lastClaimNo.split("-")[1], 10);
            if (!isNaN(lastSeq)) {
                nextSeq = lastSeq + 1;
            }
        }

        // 3. รวมเป็น claim_no ใหม่ (เช่น CLM260824-0001)
        const generatedClaimNo = `${datePrefix}-${String(nextSeq).padStart(4, '0')}`;

        const result = await pool.request()
            .input("claim_no", sql.VarChar, generatedClaimNo)
            .input("agent_id", sql.Int, agent_id)
            .input("item_id", sql.Int, item_id)
            .input("lot_no", sql.VarChar, lot_no)
            .input("mfg_date", sql.Date, mfg_date)
            .input("expire_date", sql.Date, expire_date)
            .input("qty", sql.Int, qty)
            .input("qtychang", sql.Int, qtychang)
            .input("remark", sql.NVarChar(sql.MAX), remark)
            .input("current_status", sql.VarChar, current_status)
            .input("driver_receive_date", sql.DateTime, driver_receive_date || null)
            .input("warehouse_receive_date", sql.DateTime, warehouse_receive_date || null)
            .input("approve_date", sql.DateTime, approve_date || null)
            .input("delivery_date", sql.DateTime, delivery_date || null)
            .input("receive_finish_date", sql.DateTime, receive_finish_date || null)
            .input("created_by", sql.VarChar, created_by)
            .query(`
                INSERT INTO [EasyClaim_Dev].[dbo].[claims]
                (
                    claim_no,
                    agent_id,
                    claim_date,
                    item_id,
                    lot_no,
                    mfg_date,
                    expire_date,
                    qty,
                    qtychang,
                    remark,
                    current_status,
                    driver_receive_date,
                    warehouse_receive_date,
                    approve_date,
                    delivery_date,
                    receive_finish_date,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    @claim_no,
                    @agent_id,
                    GETDATE(),
                    @item_id,
                    @lot_no,
                    @mfg_date,
                    @expire_date,
                    @qty,
                    @qtychang,
                    @remark,
                    @current_status,
                    @driver_receive_date,
                    @warehouse_receive_date,
                    @approve_date,
                    @delivery_date,
                    @receive_finish_date,
                    @created_by,
                    GETDATE(),
                    GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS claim_id;
            `);

        res.json({
            status: true,
            message: "Insert Success",
            claim_id: result.recordset[0].claim_id,
            claim_no: generatedClaimNo
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

exports.updateClaim = async (req, res) => {
    try {
        const {
            claim_id,
            claim_no,
            agent_id,
            claim_date,
            item_id,
            lot_no,
            mfg_date,
            expire_date,
            qty,
            qtychang,
            remark,
            current_status,
            driver_receive_date,
            warehouse_receive_date,
            approve_date,
            delivery_date,
            receive_finish_date,
            created_by
        } = req.body;

        const pool = await connectDB();

        const result = await pool.request()
            .input("claim_id", sql.Int, claim_id)
            .input("claim_no", sql.VarChar, claim_no)
            .input("agent_id", sql.Int, agent_id)
            .input("claim_date", sql.DateTime, claim_date)
            .input("item_id", sql.Int, item_id)
            .input("lot_no", sql.VarChar, lot_no)
            .input("mfg_date", sql.Date, mfg_date)
            .input("expire_date", sql.Date, expire_date)
            .input("qty", sql.Int, qty)
            .input("qtychang", sql.Int, qtychang)
            .input("remark", sql.NVarChar(sql.MAX), remark)
            .input("current_status", sql.VarChar, current_status)
            .input("driver_receive_date", sql.DateTime, driver_receive_date || null)
            .input("warehouse_receive_date", sql.DateTime, warehouse_receive_date || null)
            .input("approve_date", sql.DateTime, approve_date || null)
            .input("delivery_date", sql.DateTime, delivery_date || null)
            .input("receive_finish_date", sql.DateTime, receive_finish_date || null)
            .input("created_by", sql.VarChar, created_by)
            .query(`
                UPDATE [EasyClaim_Dev].[dbo].[claims]
                SET
                    claim_no = @claim_no,
                    agent_id = @agent_id,
                    claim_date = @claim_date,
                    item_id = @item_id,
                    lot_no = @lot_no,
                    mfg_date = @mfg_date,
                    expire_date = @expire_date,
                    qty = @qty,
                    qtychang = @qtychang,
                    remark = @remark,
                    current_status = @current_status,
                    driver_receive_date = @driver_receive_date,
                    warehouse_receive_date = @warehouse_receive_date,
                    approve_date = @approve_date,
                    delivery_date = @delivery_date,
                    receive_finish_date = @receive_finish_date,
                    created_by = @created_by,
                    updated_at = GETDATE()
                WHERE claim_id = @claim_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: false,
                message: "Claim not found"
            });
        }

        res.json({
            status: true,
            message: "Update Success"
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

exports.delClaim = async (req, res) => {
    let transaction;
    try {
        const { claim_id } = req.body; // รับค่า claim_id จาก request body

        if (!claim_id) {
            return res.status(400).json({
                status: false,
                message: "กรุณาระบุ claim_id"
            });
        }

        const pool = await connectDB(); // เชื่อมต่อกับฐานข้อมูล[cite: 17]
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input("claim_id", sql.Int, claim_id);

        // 1. ลบรูปภาพที่เกี่ยวข้องในตาราง claim_images
        await request.query(`
            DELETE FROM [EasyClaim_Dev].[dbo].[claim_images]
            WHERE claim_id = @claim_id
        `);

        // 2. ลบประวัติสถานะในตาราง claim_status_logs
        await request.query(`
            DELETE FROM [EasyClaim_Dev].[dbo].[claim_status_logs]
            WHERE claim_id = @claim_id
        `);

        // 3. ลบประวัติการอนุมัติในตาราง claim_approves
        await request.query(`
            DELETE FROM [EasyClaim_Dev].[dbo].[claim_approves]
            WHERE claim_id = @claim_id
        `);

        // 4. ลบรายการหลักในตาราง claims[cite: 17]
        const result = await request.query(`
            DELETE FROM [EasyClaim_Dev].[dbo].[claims]
            WHERE claim_id = @claim_id
        `);

        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({
                status: false,
                message: "Claim not found" // ตอบกลับเมื่อไม่พบรายการที่ต้องการลบ[cite: 17]
            });
        }

        await transaction.commit();

        res.json({
            status: true,
            message: "Delete Success" // ตอบกลับเมื่อลบสำเร็จ[cite: 17]
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        res.status(500).json({
            status: false,
            message: error.message // ตอบกลับเมื่อเกิดข้อผิดพลาด[cite: 17]
        });
    }
};