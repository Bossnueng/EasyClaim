const { sql, connectDB } = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios"); // 🟢 Import axios สำหรับส่ง Webhook หา MS Teams

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

// 🟢 2. ฟังก์ชันสำหรับส่งการแจ้งเตือนเข้า Microsoft Teams
const sendTeamsNotification = async (claimData) => {
  //  นำ Webhook URL จาก MS Teams Channel มาตั้งค่าผ่าน .env หรือใส่ URL ตรงนี้
  const webhookUrl =
    process.env.TEAMS_WEBHOOK_URL ||
    "https://default1d8f5d8591094cdaabcf3fa469cbf8.f9.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/05/workflows/b8f5ff483d22437da59977d9cc7987de/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=4h8h9gq_LpLr1lG9DdVsm6iYOen3GGf6LqT5_1ddniQ";

  const messagePayload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "0076D7", // สีฟ้า Teams
    summary: `มีรายการเคลมใหม่: ${claimData.claim_no}`,
    sections: [
      {
        activityTitle: "🚨 **มีรายการเคลมใหม่เข้ามาในระบบ**",
        facts: [
          { name: "เลขที่ใบเคลม:", value: claimData.claim_no || "-" },
          { name: "ผู้แจ้งรายการ:", value: claimData.created_by || "-" },
          { name: "หมายเลข Lot:", value: claimData.lot_no || "-" },
          { name: "จำนวน:", value: `${claimData.qty} ชิ้น` },
          { name: "รายละเอียด:", value: claimData.remark || "-" },
        ],
        markdown: true,
      },
    ],
  };

  try {
    await axios.post(webhookUrl, messagePayload);
  } catch (error) {
    // ดัก Error ไว้เพื่อไม่ให้ส่งผลกระทบต่อกระบวนการหลักของ DB
    console.error("Teams Notification Error:", error.message);
  }
};

function parseDate(value, fieldName) {
    console.log(fieldName, "=", value);
    console.log("typeof =", typeof value);

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        throw new Error(`${fieldName} ไม่ใช่วันที่ที่ถูกต้อง: ${value}`);
    }

    return date;
}

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
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("claim_id", sql.NVarChar, claim_id)
      .input("status", sql.NVarChar, status)
      .input("remark", sql.NVarChar(sql.MAX), remark)
      .input("update_by", sql.Int, update_by).query(`
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
      log_id: result.recordset[0].log_id,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
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

    // 🟢 ดึง Host และ Protocol ของเครื่อง Server (เครื่อง A) อัตโนมัติ
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const full_image_url = `${baseUrl}${relative_path}`;

    res.json({
      status: true,
      message: "Insert Success",
      image_id: result.recordset[0].image_id,
      image_path: relative_path, // สำหรับใช้ภายในระบบเดิม
      image_url: full_image_url, // 🟢 สำหรับให้ Frontend เครื่อง B เอาไป <img src="..."> ได้เลย
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

    // 🟢 สร้าง Base URL จาก IP/Domain ของเซิร์ฟเวอร์
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // 🟢 เพิ่ม image_url ให้กับทุกรายการรูปภาพ
    const formattedData = result.recordset.map((img) => ({
      ...img,
      image_url: `${baseUrl}${img.image_path}`,
    }));

    res.json({
      status: true,
      data: formattedData, // 🟢 แก้ไขตรงนี้ให้ใช้ formattedData
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
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("claim_id", sql.Int, claim_id)
      .input("approve_by", sql.NVarChar, approve_by)
      .input("approve_status", sql.NVarChar, approve_status)
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
    const result = await pool.request().input("agent_id", sql.Int, agent_id)
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
    const result = await pool.request().query(`
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
            FROM [EasyClaim_Dev].[dbo].[claims] with(NOLOCK)
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

exports.creartClaim = async (req, res) => {
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
  try {
    try {
          const {
                claim_no,
                agent_id,
                current_status,
                driver_receive_date,
                warehouse_receive_date,
                approve_date,
                delivery_date,
                receive_finish_date,
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
          const items = JSON.parse(req.body.items);

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

        // =====================================
        // 1. Insert claims
        // =====================================

        const claimResult = await transaction.request()
            .input("claim_no", sql.NVarChar(50), claim_no)
            .input("agent_id", sql.Int, agent_id)
            .input("current_status", sql.NVarChar(50), current_status)
            .input(
                "driver_receive_date",
                sql.DateTime,
                parseDate(driver_receive_date, "driver_receive_date")
            )
            .input(
                "warehouse_receive_date",
                sql.DateTime,
                parseDate(warehouse_receive_date, "warehouse_receive_date")
            )
            .input(
                "approve_date",
                sql.DateTime,
                parseDate(approve_date, "approve_date")
            )
            .input(
                "delivery_date",
                sql.DateTime,
                parseDate(delivery_date, "delivery_date")
            )
            .input(
                "receive_finish_date",
                sql.DateTime,
                parseDate(receive_finish_date, "receive_finish_date")
            )
            .input("created_by", sql.Int, created_by)
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
                    updated_at
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
                    GETDATE()
                );

                SELECT SCOPE_IDENTITY() AS claim_id;
            `);

        const claim_id = claimResult.recordset[0].claim_id;

        // =====================================
        // 2. Insert Items
        // =====================================

        for (const item of items) {

            const {
                item_id,
                lot_no,
                mfg_date,
                expire_date,
                qty,
                remark
            } = item;

            const itemResult = await transaction.request()
                .input("claim_id", sql.Int, claim_id)
                .input("item_id", sql.Int, item_id)
                .input("lot_no", sql.NVarChar(100), lot_no || null)
                .input("mfg_date", sql.Date, mfg_date || null)
                .input("expire_date", sql.Date, expire_date || null)
                .input("qty", sql.Decimal(18, 2), qty)
                .input("qtychang", sql.Decimal(18, 2), 0)
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
                        @remark,
                        GETDATE(),
                        GETDATE()
                    );

                    SELECT SCOPE_IDENTITY() AS claim_item_id;
                `);

            const claim_item_id = itemResult.recordset[0].claim_item_id;

            // =====================================
            // 3. Insert Images
            // =====================================
            const files = (req.files || []).filter(
                file => file.fieldname === `images[${item_id}]`
            );

            console.log("ITEM ID:", item_id);
            console.log("FILES:", files);

            for (const file of files) {

                console.log("INSERT IMAGE:", file.filename);

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
        // 4. Commit
        // =====================================

        await transaction.commit();

        res.json({
            status: true,
            message: "Insert Success",
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

        res.status(500).json({
            status: false,
            message: error.message
        });
    }

    res.json({
      status: true,
      message: "Update Success",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
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

exports.updataclaim = async (req, res) => {

    try {

        const {
            claim_id,
            status,
            actionsname
        } = req.body;

        // =========================
        // Validate
        // =========================
        if (!claim_id) {
            return res.status(400).json({
                status: false,
                message: "claim_id is required"
            });
        }

        if (!actionsname) {
            return res.status(400).json({
                status: false,
                message: "actionsname is required"
            });
        }

        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);

        try {

            await transaction.begin();

            // =========================
            // ตรวจสอบ Claim
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
            // กำหนด Column ที่จะ Update
            // =========================
            let dateColumn = null;

            switch (actionsname) {

                case "driver_receive_date":
                    dateColumn = "driver_receive_date";
                    break;

                case "warehouse_receive_date":
                    dateColumn = "warehouse_receive_date";
                    break;

                case "approve_date":
                    dateColumn = "approve_date";
                    break;

                case "delivery_date":
                    dateColumn = "delivery_date";
                    break;

                case "receive_finish_date":
                    dateColumn = "receive_finish_date";
                    break;

                default:

                    await transaction.rollback();

                    return res.status(400).json({
                        status: false,
                        message: "Invalid actionsname"
                    });
            }

            // =========================
            // Update Claim
            // =========================
            const result = await transaction.request()
                .input("claim_id", sql.Int, claim_id)
                .input("status", sql.NVarChar(50), status || null)
                .query(`
                    UPDATE [EasyClaim_Dev].[dbo].[claims]
                    SET
                        current_status = @status,
                        ${dateColumn} = GETDATE(),
                        updated_at = GETDATE()
                    WHERE claim_id = @claim_id
                `);

            // =========================
            // Commit
            // =========================
            await transaction.commit();

            return res.json({
                status: true,
                message: "Update Success",
                claim_id: claim_id,
                actionsname: actionsname,
                current_status: status,
                updated: result.rowsAffected[0] > 0
            });

        } catch (error) {

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

        console.error("updataclaim Error:", error);

        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};




