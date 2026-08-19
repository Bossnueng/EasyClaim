const { sql, connectDB } = require("../config/db");

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
        const update_date = datatime();
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
                update_date,
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
            item_id: result.recordset[0].item_id

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
        const { claim_id, image_path, image_type } = req.body;
        const created_at = datatime();
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
        )
             SELECT SCOPE_IDENTITY() AS image_id;
            `);
        res.json({

            status: true,
            message: "Insert Success",
            image_id: result.recordset[0].image_id

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
            GETDATE();
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
    try {
        const {
            claim_no,
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
        const result = await pool.request()
            .input("claim_no", sql.VarChar, claim_no)
            .input("agent_id", sql.Int, agent_id)
            .input("item_id", sql.Int, item_id)
            .input("lot_no", sql.VarChar, lot_no)
            .input("mfg_date", sql.Date, mfg_date)
            .input("expire_date", sql.Date, expire_date)
            .input("qty", sql.Int, qty)
            .input("qtychang", sql.Int, qtychang)
            .input("remark", sql.NVarChar(sql.MAX), remark)
            .input("current_status", sql.VarChar, current_status)
            .input("driver_receive_date", sql.DateTime, driver_receive_date)
            .input("warehouse_receive_date", sql.DateTime, warehouse_receive_date)
            .input("approve_date", sql.DateTime, approve_date)
            .input("delivery_date", sql.DateTime, delivery_date)
            .input("receive_finish_date", sql.DateTime, receive_finish_date)
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
            claim_id: result.recordset[0].claim_id
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
                    qtychang=@qtychang,
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
    try {
        const { claim_id } = req.body;

        const pool = await connectDB();

        const result = await pool.request()
            .input("claim_id", sql.Int, claim_id)
            .query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[claims]
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
            message: "Delete Success"
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};


