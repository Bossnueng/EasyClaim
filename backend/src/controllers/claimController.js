/*==================================
Detail : Fix resolve merge conflicts with main 2nd

๊Update by : Phonnapha.k
Date : 24/09/2026
==================================*/

const { sql, connectDB } = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { getIO } = require("../../socket/claimSocket");

//ตั้งค่าการจัดเก็บไฟล์ภาพลงเครื่อง Server
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

// 1. ปรับฟังก์ชัน sendTeamsNotification ให้ดึง URL ตาม agentId
const sendTeamsNotification = async (claimData, agentId) => {
  const DEFAULT_WEBHOOK = process.env.TEAMS_WEBHOOK_URL;
  let webhookUrl = DEFAULT_WEBHOOK;

  // ค้นหา Webhook URL ของ Agent
  if (agentId) {
    try {
      const pool = await connectDB();
      const agentResult = await pool.request()
        .input("agent_id", sql.Int, agentId)
        .query(`
          SELECT teams_webhook_url 
          FROM [EasyClaim_Dev].[dbo].[agents] 
          WHERE agent_id = @agent_id
        `);

      if (agentResult.recordset.length > 0 && agentResult.recordset[0].teams_webhook_url) {
        webhookUrl = agentResult.recordset[0].teams_webhook_url;
      }
    } catch (dbErr) {
      console.error("Fetch Agent Webhook Error:", dbErr.message);
    }
  }

  const messagePayload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "0076D7",
    summary: `มีรายการเคลมใหม่: ${claimData.claim_no}`,
    sections: [
      {
        activityTitle: "🚨 **มีรายการเคลมใหม่เข้ามาในระบบ**",
        facts: [
          { name: "เลขที่ใบเคลม:", value: claimData.claim_no || "-" },
          { name: "ผู้แจ้งรายการ (ID):", value: String(claimData.created_by || "-") },
          { name: "จำนวนรวม:", value: `${claimData.qty} ชิ้น` },
          { name: "รายละเอียด:", value: claimData.remark || "-" },
        ],
        markdown: true,
      },
    ],
  };

  try {
    await axios.post(webhookUrl, messagePayload);
  } catch (error) {
    console.error("Teams Notification Error:", error.message);
  }
};



exports.upload = multer({ storage: storage });


exports.getclaimstatuslog = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
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
      data: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.createClaimStatusLogs = async (req, res) => {
  try {
    const { claim_id, status, remark, update_by } = req.body;

    if (!remark) {
      return res.status(400).json({ status: false, message: "กรุณาระบุข้อความ หรือ remark" });
    }

    const pool = await connectDB();
    const result = await pool.request()
      .input("claim_id", sql.Int, claim_id)
      .input("status", sql.Int, status)
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

    const newLogId = result.recordset[0]?.log_id || null;

    // 🟢 ส่ง Socket Event เมื่อมีการส่งข้อความ หรืออัปเดต Log
    try {
      const newComment = {
        log_id: newLogId,
        claim_id,
        status,
        remark,
        update_by,
        update_date: new Date()
      };
      getIO().to(`claim:${claim_id}`).emit("claim:comment_created", newComment);
    } catch (socketErr) {
      console.error("Socket emit error:", socketErr.message);
    }


    res.json({
      status: true,
      message: status ? "บันทึกการเปลี่ยนสถานะสำเร็จ" : "ส่งข้อความสำเร็จ",
      log_id: result.recordset[0]?.log_id || null
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

exports.createClaimimage = async (req, res) => {
  try {
    const claim_id = req.body.claim_id;
    const image_type = req.body.image_type || "CLAIM_ATTACHMENT";

    if (!req.file) {
      return res
        .status(400)
        .json({ status: false, message: "กรุณาแนบไฟล์รูปภาพ" });
    }

    const relative_path = `/uploads/claims/${req.file.filename}`;

    const pool = await connectDB();
    const result = await pool
      .request()
      .input("claim_id", sql.Int, claim_id)
      .input("image_path", sql.VarChar, relative_path)
      .input("image_type", sql.VarChar, image_type).query(`
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

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const full_image_url = `${baseUrl}${relative_path}`;

    res.json({
      status: true,
      message: "Insert Success",
      image_id: result.recordset[0].image_id,
      image_path: relative_path,
      image_url: full_image_url,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.deleteClaimimage = async (req, res) => {
  try {
    const { image_id } = req.body;
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("image_id", sql.Int, image_id).query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[claim_images]
                WHERE image_id = @image_id
            `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        status: false,
        message: "Image not found",
      });
    }

    res.json({
      status: true,
      message: "Delete Success",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.delClaimImages = async (req, res) => {
  try {
    const { image_ids } = req.body;

    if (!Array.isArray(image_ids) || image_ids.length === 0) {
      return res.status(400).json({
        status: false,
        message: "กรุณาส่ง image_ids เป็น Array",
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
      deleted: result.rowsAffected[0],
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getclaimapproves = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
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
      data: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getClaimImages = async (req, res) => {
  try {
    const { claim_id } = req.params;
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("claim_id", sql.Int, claim_id).query(`
        SELECT [image_id]
              ,[claim_id]
              ,[image_path]
              ,[image_type]
              ,[created_at]
        FROM [EasyClaim_Dev].[dbo].[claim_images]
        WHERE claim_id = @claim_id
        ORDER BY image_id ASC
      `);

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    const formattedData = result.recordset.map((img) => {
      let rawPath = img.image_path || "";

      if (!rawPath.startsWith("/")) {
        rawPath = `/${rawPath}`;
      }

      if (!rawPath.startsWith("/uploads")) {
        rawPath = `/uploads/claims${rawPath}`;
      }

      return {
        ...img,
        image_path: rawPath,
        image_url: `${baseUrl}${rawPath}`,
      };
    });

    res.json({
      status: true,
      data: formattedData,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.createClaimapproves = async (req, res) => {
  try {
    const { claim_id, approve_by, approve_status, approve_remark } = req.body;
    const parsedApproveStatus = (approve_status === false || approve_status === "0" || approve_status === "false")
      ? "false"
      : "true";

    const pool = await connectDB();
    const result = await pool
      .request()
      .input("claim_id", sql.Int, claim_id)
      .input("approve_by", sql.NVarChar, approve_by)
      .input("approve_status", sql.NVarChar, parsedApproveStatus) // หรือใช้ sql.Bit หาก DB เป็นประเภท Bit
      .input("approve_remark", sql.NVarChar(sql.MAX), approve_remark).query(`
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
      approve_id: result.recordset[0].approve_id,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.delClaimApprove = async (req, res) => {
  try {
    const { approve_id } = req.body;
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("approve_id", sql.Int, approve_id).query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[claim_approves]
                WHERE approve_id = @approve_id
            `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        status: false,
        message: "Approve not found",
      });
    }

    res.json({
      status: true,
      message: "Delete Success",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getClaimByAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;
    const pool = await connectDB();
    
    // 🟢 ใช้ตาราง user_agents (มี s) เพื่อไม่ให้เกิด Error
    const result = await pool.request().input("agent_id", sql.Int, agent_id)
      .query(`
        SELECT DISTINCT 
            c.[claim_id]
           ,c.[claim_no]
           ,c.[agent_id]
           ,c.[claim_date]
           ,c.[current_status]
           ,c.[driver_receive_date]
           ,c.[warehouse_receive_date]
           ,c.[approve_date]
           ,c.[delivery_date]
           ,c.[receive_finish_date]
           ,c.[created_by]
           ,c.[created_at]
           ,c.[updated_at]
           ,c.[warehouse]
           ,a.[agent_name]
           ,a.[agent_code]
        FROM [EasyClaim_Dev].[dbo].[claims] c WITH(NOLOCK)
        LEFT JOIN [EasyClaim_Dev].[dbo].[agents] a WITH(NOLOCK)
          ON CAST(c.agent_id AS VARCHAR) = CAST(a.agent_id AS VARCHAR)
          OR CAST(c.agent_id AS VARCHAR) = CAST(a.agent_code AS VARCHAR)
        LEFT JOIN [EasyClaim_Dev].[dbo].[user_agents] ua WITH(NOLOCK)
          ON a.agent_id = ua.agent_id
        WHERE a.agent_id = @agent_id 
           OR ua.agent_id = @agent_id
           OR c.agent_id = @agent_id
        ORDER BY c.[claim_id] DESC
      `);

    res.json({
      status: true,
      data: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getClaim = async (req, res) => {
  try {
    const pool = await connectDB();

    const user = req.user || {};
    const role_id = user.role_id;
    const agent_ids = user.agent_ids || [];

    let query = `
      SELECT 
        c.*, 
        a.agent_name, 
        a.agent_code 
      FROM [EasyClaim_Dev].[dbo].[claims] c WITH(NOLOCK)
      LEFT JOIN [EasyClaim_Dev].[dbo].[agents] a WITH(NOLOCK) 
        ON CAST(c.agent_id AS VARCHAR) = CAST(a.agent_id AS VARCHAR)
        OR CAST(c.agent_id AS VARCHAR) = CAST(a.agent_code AS VARCHAR)
    `;

    const request = pool.request();

    if (role_id && Number(role_id) !== 1) {
      if (agent_ids.length === 0) {
        return res.json({ status: true, data: [] });
      }
      query += ` WHERE c.agent_id IN (${agent_ids.join(',')})`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await request.query(query);
    res.json({ status: true, data: result.recordset });

  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.getClaimreturn = async (req, res) => {
  try {
    const {
      claim_id,
    } = req.body;
    const pool = await connectDB();
    const result = await pool.request()
      .input("claim_id", sql.Int, claim_id)
      .query(`
                  SELECT [claim_id]
      ,[claim_no]
      ,[agent_id]
      ,[claim_date]
      ,[current_status]
      ,[driver_receive_date]
      ,[warehouse_receive_date]
      ,[approve_date]
      ,[delivery_date]
      ,[receive_finish_date]
      ,[created_by]
      ,[created_at]
      ,[updated_at]
      ,[warehouse]
      ,[truckname]
      ,[shipment]
  FROM [EasyClaim_Dev].[dbo].[claims]
  where claim_id=@claim_id
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

exports.creartClaim = async (req, res) => {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      claim_no,
      agent_id,
      shipment,
      current_status,
      driver_receive_date,
      warehouse_receive_date,
      approve_date,
      delivery_date,
      receive_finish_date,
      warehouse,
      truckname,
      created_by
    } = req.body;

    console.log("BODY =================");
    console.log(req.body);

    if (!req.body || !req.body.items) {
      return res.status(400).json({
        status: false,
        message: "กรุณาระบุ items"
      });
    }

    // items ส่งมาเป็น JSON string
    const items = typeof req.body.items === "string"
      ? JSON.parse(req.body.items)
      : req.body.items;

    if (!claim_no) {
      return res.status(400).json({
        status: false,
        message: "กรุณาระบุ claim_no"
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: false,
        message: "กรุณาระบุ items อย่างน้อย 1 รายการ"
      });
    }

    await transaction.begin();

    // Helper Function สำหรับจัดการแปลงวันที่
    const safeDate = (dateVal) => {
      if (!dateVal || dateVal === "null" || dateVal === "undefined") return null;
      const parsed = new Date(dateVal);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const initialStatus = current_status || "รอการพิจารณา";

    // =====================================
    // 1. Insert claims
    // =====================================
    const claimResult = await transaction.request()
      .input("claim_no", sql.NVarChar(50), claim_no)
      .input("agent_id", sql.Int, agent_id ? parseInt(agent_id) : null)
      .input("current_status", sql.NVarChar(50), initialStatus)
      .input("driver_receive_date", sql.DateTime, safeDate(driver_receive_date))
      .input("warehouse_receive_date", sql.DateTime, safeDate(warehouse_receive_date))
      .input("approve_date", sql.DateTime, safeDate(approve_date))
      .input("delivery_date", sql.DateTime, safeDate(delivery_date))
      .input("receive_finish_date", sql.DateTime, safeDate(receive_finish_date))
      .input("created_by", sql.Int, created_by ? parseInt(created_by) : null)
      .input("warehouse", sql.NVarChar(100), warehouse)
      .input("truckname", sql.NVarChar(10), truckname)
      .input("shipment", sql.NVarChar(50), shipment)
      .query(`
                INSERT INTO [EasyClaim_Dev].[dbo].[claims]
                (
                    claim_no,
                    agent_id,
                    claim_date,
                    current_status,
                    driver_receive_date,
                    warehouse_receive_date,
                    approve_date,
                    delivery_date,
                    receive_finish_date,
                    created_by,
                    created_at,
                    updated_at,
                    warehouse,
                    truckname,
                    shipment
                )
                VALUES
                (
                    @claim_no,
                    @agent_id,
                    GETDATE(),
                    @current_status,
                    @driver_receive_date,
                    @warehouse_receive_date,
                    @approve_date,
                    @delivery_date,
                    @receive_finish_date,
                    @created_by,
                    GETDATE(),
                    GETDATE(),
                    @warehouse,
                    @truckname,
                    @shipment
                );

                SELECT SCOPE_IDENTITY() AS claim_id;
            `);

    const claim_id = claimResult.recordset[0].claim_id;

    // =====================================
    // 2. Insert Items & Images
    // =====================================
    for (const item of items) {
      const {
        item_id,
        lot_no,
        mfg_date,
        expire_date,
        qty,
        qtychang,
        qtyreceived,
        remark
      } = item;

      const itemResult = await transaction.request()
        .input("claim_id", sql.Int, claim_id)
        .input("item_id", sql.Int, parseInt(item_id))
        .input("lot_no", sql.NVarChar(100), lot_no || null)
        .input("mfg_date", sql.Date, safeDate(mfg_date))
        .input("expire_date", sql.Date, safeDate(expire_date))
        .input("qty", sql.Decimal(18, 2), parseFloat(qty) || 0)
        .input("qtychang", sql.Decimal(18, 2), parseFloat(qtychang) || 0)
        .input("qtyreceived", sql.Decimal(18, 2), parseFloat(qtyreceived) || 0)
        .input("remark", sql.NVarChar(500), remark || null)
        .query(`
                    INSERT INTO [EasyClaim_Dev].[dbo].[claim_items]
                    (
                        claim_id,
                        item_id,
                        lot_no,
                        mfg_date,
                        expire_date,
                        qty,
                        qtychang,
                        qtyreceived,
                        remark,
                        created_at,
                        updated_at
                    )
                    VALUES
                    (
                        @claim_id,
                        @item_id,
                        @lot_no,
                        @mfg_date,
                        @expire_date,
                        @qty,
                        @qtychang,
                        @qtyreceived,
                        @remark,
                        GETDATE(),
                        GETDATE()
                    );

                    SELECT SCOPE_IDENTITY() AS claim_item_id;
                `);

      const claim_item_id = itemResult.recordset[0].claim_item_id;

      // บันทึกรูปภาพประกอบ Item
      const files = (req.files || []).filter(
        file => file.fieldname === `images[${item_id}]`
      );

      for (const file of files) {
        await transaction.request()
          .input("claim_id", sql.Int, claim_id)
          .input("claim_item_id", sql.Int, claim_item_id)
          .input("image_path", sql.NVarChar(500), file.filename)
          .input("image_type", sql.NVarChar(50), "claim_item")
          .query(`
                        INSERT INTO [EasyClaim_Dev].[dbo].[claim_images]
                        (
                            claim_id,
                            claim_item_id,
                            image_path,
                            image_type,
                            created_at
                        )
                        VALUES
                        (
                            @claim_id,
                            @claim_item_id,
                            @image_path,
                            @image_type,
                            GETDATE()
                        );
                    `);
      }
    }

    // =====================================
    // 3. Insert Claim Status Log (สร้างประวัติ Log เริ่มต้น)
    // =====================================
    // 3.1 Log สถานะ 1: "สร้างรายการเคลม" โดย User ลูกค้า
    await transaction.request()
      .input("claim_id", sql.Int, claim_id)
      .input("status", sql.Int, 1) // ID สถานะ 1 = สร้างรายการเคลม
      .input("remark", sql.NVarChar(500), "สร้างรายการเคลมสินค้าใหม่ในระบบ")
      .input("update_by", sql.Int, created_by ? parseInt(created_by) : null)
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
            `);


    const updateBy = req.user?.id || req.body.created_by || 0;

    await transaction.request()
      .input("claim_id_auto", sql.Int, claim_id)
      .input("status_auto", sql.Int, 5)
      .input("remark_auto", sql.NVarChar(500), "ระบบปรับสถานะเป็นรอการพิจารณาอัตโนมัติ")
      .input("update_by", sql.Int, parseInt(updateBy))
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
                    @claim_id_auto,
                    @status_auto,
                    @remark_auto,
                    @update_by, -- 🟢 เปลี่ยนจาก NULL เป็น @update_by
                    GETDATE()
                );
            `);

    // =====================================
    // 4. Commit Transaction
    // =====================================
    await transaction.commit();

    // ส่งการแจ้งเตือนเข้า MS Teams หลังบันทึกข้อมูลสำเร็จ
    try {
      sendTeamsNotification({
        claim_no: claim_no,
        created_by: created_by,
        lot_no: items[0]?.lot_no || "-",
        qty: items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0),
        remark: items[0]?.remark || "สร้างรายการเคลมใหม่"
      }, agent_id ? parseInt(agent_id) : null); // 👈 ส่ง agent_id เพิ่มตรงนี้
    } catch (teamsErr) {
      console.error("Teams Notification Call Error:", teamsErr);
    }

    return res.json({
      status: true,
      message: "สร้างรายการเคลมเรียบร้อยแล้ว",
      claim_id: claim_id,
      claim_no: claim_no,
      item_count: items.length
    });

  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Rollback Error:", rollbackError);
    }

    console.error("Create Claim Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};


exports.delClaim = async (req, res) => {

  try {

    const { claim_id } = req.body;

    // =========================
    // ตรวจสอบ claim_id
    // =========================
    if (!claim_id) {
      return res.status(400).json({
        status: false,
        message: "claim_id is required"
      });
    }

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    // เก็บข้อมูลไฟล์ไว้สำหรับลบหลัง Commit
    let imageFiles = [];

    try {

      await transaction.begin();

      // =========================
      // 1. ตรวจสอบ Claim
      // =========================
      const checkClaim = await transaction.request()
        .input("claim_id", sql.Int, claim_id)
        .query(`
                    SELECT claim_id
                    FROM [EasyClaim_Dev].[dbo].[claims]
                    WHERE claim_id = @claim_id
                `);

      if (checkClaim.recordset.length === 0) {

        await transaction.rollback();

        return res.status(404).json({
          status: false,
          message: "Claim not found"
        });
      }

      // =========================
      // 2. ดึงรูปทั้งหมดของ Claim
      // =========================
      const imageResult = await transaction.request()
        .input("claim_id", sql.Int, claim_id)
        .query(`
                    SELECT 
                        image_id,
                        image_path
                    FROM [EasyClaim_Dev].[dbo].[claim_images]
                    WHERE claim_id = @claim_id
                `);

      imageFiles = imageResult.recordset;

      console.log("Images to delete:", imageFiles);

      // =========================
      // 3. ลบ claim_images ก่อน
      // =========================
      const deleteImages = await transaction.request()
        .input("claim_id", sql.Int, claim_id)
        .query(`
                    DELETE FROM [EasyClaim_Dev].[dbo].[claim_images]
                    WHERE claim_id = @claim_id
                `);

      // =========================
      // 4. ลบ claim_approves
      // =========================
      const deleteApproves = await transaction.request()
        .input("claim_id", sql.Int, claim_id)
        .query(`
                    DELETE FROM [EasyClaim_Dev].[dbo].[claim_approves]
                    WHERE claim_id = @claim_id
                `);

      // =========================
      // 5. ลบ claim_items
      // =========================
      const deleteItems = await transaction.request()
        .input("claim_id", sql.Int, claim_id)
        .query(`
                    DELETE FROM [EasyClaim_Dev].[dbo].[claim_items]
                    WHERE claim_id = @claim_id
                `);

      // =========================
      // 6. ลบ claims
      // =========================
      const deleteClaim = await transaction.request()
        .input("claim_id", sql.Int, claim_id)
        .query(`
                    DELETE FROM [EasyClaim_Dev].[dbo].[claims]
                    WHERE claim_id = @claim_id
                `);

      // =========================
      // 7. Commit
      // =========================
      await transaction.commit();

      // ==================================================
      // 8. ลบไฟล์จริง หลังจาก Database Commit สำเร็จ
      // ==================================================
      const fs = require("fs");
      const path = require("path");

      for (const image of imageFiles) {

        if (!image.image_path) {
          continue;
        }

        const filePath = path.join(
          __dirname,
          "../uploads/claims",
          image.image_path
        );

        console.log("Delete file:", filePath);

        if (fs.existsSync(filePath)) {

          fs.unlinkSync(filePath);

          console.log(
            "Deleted:",
            image.image_path
          );

        } else {

          console.log(
            "File not found:",
            filePath
          );
        }
      }

      // =========================
      // Response
      // =========================
      return res.json({
        status: true,
        message: "Delete Success",
        claim_id: claim_id,
        deleted: {
          claim_approves: deleteApproves.rowsAffected[0],
          claim_images: deleteImages.rowsAffected[0],
          claim_items: deleteItems.rowsAffected[0],
          claims: deleteClaim.rowsAffected[0]
        }
      });

    } catch (error) {

      // =========================
      // Rollback
      // =========================
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }

      throw error;
    }

  } catch (error) {

    console.error("delClaim Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};


exports.updateclaim = async (req, res) => {
  const transaction = null;

  try {
    const { claim_id } = req.body;
    let { items } = req.body;

    // ตรวจสอบ claim_id
    const claimId = Number(claim_id);

    if (!Number.isInteger(claimId) || claimId <= 0) {
      return res.status(400).json({
        status: false,
        message: "claim_id ไม่ถูกต้อง"
      });
    }

    // แปลง items จาก JSON String เป็น Array
    if (typeof items === "string") {
      items = JSON.parse(items);
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        status: false,
        message: "items ต้องเป็น Array"
      });
    }

    const pool = await connectDB();
    const tx = new sql.Transaction(pool);

    await tx.begin();

    try {
      for (const item of items) {
        const {
          claim_item_id,
          item_id,
          qty,
          qtychang,
          qtyreceived,
          remark
        } = item;

        const claimItemId = Number(claim_item_id);
        const itemId = Number(item_id);
        const quantity = Number(qty);
        const quantityChange = Number(qtychang);
        const quantityReceived = Number(qtyreceived);

        // ตรวจสอบข้อมูลก่อน Update
        if (
          !Number.isInteger(claimItemId) ||
          claimItemId <= 0 ||
          !Number.isInteger(itemId) ||
          !Number.isFinite(quantity) ||
          !Number.isFinite(quantityChange) ||
          !Number.isFinite(quantityReceived)
        ) {
          throw new Error("ข้อมูลรายการสินค้าไม่ถูกต้อง");
        }

        const request = new sql.Request(tx);

        await request
          .input("claim_id", sql.Int, claimId)
          .input("claim_item_id", sql.Int, claimItemId)
          .input("item_id", sql.Int, itemId)
          .input("qty", sql.Int, quantity)
          .input("qtychang", sql.Int, quantityChange)
          .input("qtyreceived", sql.Int, quantityReceived)
          .input("remark", sql.NVarChar(sql.MAX), remark || null)
          .query(`
                        UPDATE Claim_Items
                        SET
                            item_id = @item_id,
                            qty = @qty,
                            qtychang = @qtychang,
                            qtyreceived = @qtyreceived,
                            remark = @remark
                        WHERE claim_item_id = @claim_item_id
                          AND claim_id = @claim_id;
                    `);
      }

      await tx.commit();

      return res.json({
        status: true,
        message: "Update Claims Success",
        claim_id: claimId,
        total_items: items.length
      });

    } catch (error) {
      await tx.rollback();
      throw error;
    }

  } catch (error) {
    console.error("updateclaim Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

/*=================== */
//For updateClaimStatus 
//by Koka 26/10/69
/*=================== */
exports.updateClaimStatus = async (req, res) => {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  try {
    const { claim_id, status, remark, update_by } = req.body;

    const claimId = Number(claim_id);
    const statusId = Number(status);

    if (!Number.isInteger(claimId) || !Number.isInteger(statusId)) {
      return res.status(400).json({
        status: false,
        message: "claim_id หรือ status ไม่ถูกต้อง"
      });
    }

    await transaction.begin();

    // 🟢 1. UPDATE ค่า current_status ในตาราง claims โดยตรง
    const updateClaimReq = new sql.Request(transaction);
    await updateClaimReq
      .input("claim_id", sql.Int, claimId)
      .input("current_status", sql.NVarChar(50), String(statusId))
      .query(`
        UPDATE [EasyClaim_Dev].[dbo].[claims]
        SET current_status = @current_status,
            updated_at = GETDATE()
        WHERE claim_id = @claim_id;
      `);

    // 🟢 2. บันทึกประวัติการเปลี่ยนสถานะลงตาราง claim_status_logs
    const logReq = new sql.Request(transaction);
    await logReq
      .input("claim_id", sql.Int, claimId)
      .input("status", sql.Int, statusId)
      .input("remark", sql.NVarChar(500), remark || `เปลี่ยนสถานะเป็น ${statusId}`)
      .input("update_by", sql.Int, update_by ? Number(update_by) : null)
      .query(`
        INSERT INTO [EasyClaim_Dev].[dbo].[claim_status_logs]
        (claim_id, status, remark, update_by, update_date)
        VALUES (@claim_id, @status, @remark, @update_by, GETDATE());
      `);

    await transaction.commit();

    // 🟢 3. ยิง Socket แจ้งเตือน Realtime ไปยังผู้ใช้
    try {
      getIO().to(`claim:${claimId}`).emit("claim:status_updated", {
        claim_id: claimId,
        status: statusId,
        update_by,
        update_date: new Date()
      });
    } catch (socketErr) {
      console.error("Socket emit error:", socketErr.message);
    }

    return res.json({
      status: true,
      message: "อัปเดตสถานะในตาราง claims เรียบร้อยแล้ว",
      claim_id: claimId,
      current_status: statusId
    });

  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rbErr) {
      console.error("Rollback error:", rbErr);
    }
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.updateClaimDate = async (req, res) => {
  try {
    const { claim_id, columnname,status } = req.body;

    // อนุญาตเฉพาะคอลัมน์ที่กำหนดไว้
    const allowedColumns = [
      'warehouse_receive_date',
      'approve_date',
      'delivery_date',
      'receive_finish_date'
    ];

    if (
      claim_id === undefined ||
      claim_id === null ||
      claim_id === '' ||
      !allowedColumns.includes(columnname)
    ) {
      return res.status(400).json({
        success: false,
        message: 'claim_id หรือ columnname ไม่ถูกต้อง'
      });
    }

    const query = `
      UPDATE claims
      SET [${columnname}] = GETDATE()
      ,current_status=@status
      WHERE claim_id = @claim_id
    `;

    const pool = await connectDB();

    const result = await pool.request()
      .input('claim_id', sql.Int, Number(claim_id))
      .input('status', sql.NVarChar(50), status)
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูล claim_id นี้'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'อัปเดตวันที่เรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('updateClaimDate error:', error);

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
    });
  }
};


exports.getClaimItems = async (req, res) => {
  try {
    const { claim_id } = req.params;
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("claim_id", sql.Int, claim_id)
      .query(`
        SELECT [claim_item_id]
              ,[claim_id]
              ,[item_id]
              ,[lot_no]
              ,[mfg_date]
              ,[expire_date]
              ,[qty]
              ,[qtychang]
              ,[qtyreceived]
              ,[remark]
              ,[created_at]
              ,[updated_at]
        FROM [EasyClaim_Dev].[dbo].[claim_items] WITH(NOLOCK)
        WHERE claim_id = @claim_id
        ORDER BY claim_item_id ASC
      `);

    res.json({
      status: true,
      data: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};




