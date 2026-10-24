const { sql, connectDB } = require("../config/db");

exports.Delivery = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .query(`
                SELECT [delivery_id]
                      ,[claim_id]
                      ,[driver_id]
                      ,[delivery_status]
                      ,[receive_date]
                      ,[created_at]
                FROM [EasyClaim_Dev].[dbo].[Delivery]
                ORDER BY [created_at] DESC
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

exports.DeliveryDriver = async (req, res) => {
    try {
        const {
            driver_id,
            receive_date,
        } = req.body;
        const deliverv_status = "8";
        const pool = await connectDB();
        const result = await pool.request()
            .input("driver_id", sql.NVarChar(20), driver_id)
            .input("receive_date", sql.Date, receive_date)
            .input("delivery_status", sql.NVarChar(1), deliverv_status)
            .query(`
                           SELECT D.delivery_id,
				D.claim_id,
				D.delivery_status,
				D.driver_id,
				D.receive_date,
				D.truck_plate,
				c.claim_no,
				c.shipment
                FROM [EasyClaim_Dev].[dbo].[Delivery] D
				left join claims c on c.claim_id=D.claim_id
                Where D.driver_id=@driver_id and convert(date,D.receive_date)=@receive_date and D.delivery_status=@delivery_status
                ORDER BY D.created_at DESC
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


exports.createDelivery = async (req, res) => {
    let uploadedFile = null;

    try {
        const {
            claim_id,
            driver_id,
            delivery_status,
            truck_plate
        } = req.body;
        console.log('createDelivery req body', req.body);
        // รับชื่อไฟล์จาก multer
        uploadedFile = req.file ? req.file.filename : null;

        const pool = await connectDB();

        const deliveryResult = await pool.request()
            .input("claim_id", sql.Int, claim_id)
            .input(
                "driver_id",
                sql.VarChar,
                driver_id ? String(driver_id) : null
            )
            .input("delivery_status", sql.VarChar, delivery_status)
            .input("truck_plate", sql.NVarChar(10), truck_plate)
            .input("img_parth", sql.NVarChar(255), uploadedFile)
            .query(`
                INSERT INTO [EasyClaim_Dev].[dbo].[Delivery]
                (
                    claim_id,
                    driver_id,
                    delivery_status,
                    receive_date,
                    truck_plate,
                    img_parth
                )
                VALUES
                (
                    @claim_id,
                    @driver_id,
                    @delivery_status,
                    GETDATE(),
                    @truck_plate,
                    @img_parth
                );

                SELECT SCOPE_IDENTITY() AS delivery_id;
            `);

        res.json({
            status: true,
            message: "Insert Delivery Success",
            delivery_id: deliveryResult.recordset[0].delivery_id,
            img_parth: uploadedFile
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};


exports.UpdataDelivery = async (req, res) => {
    try {
        const { delivery_id, claim_id, driver_id, delivery_status } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("delivery_id", sql.Int, delivery_id)
            .input("claim_id", sql.Int, claim_id)
            .input("driver_id", sql.VarChar, driver_id ? String(driver_id) : null)
            .input("delivery_status", sql.VarChar, delivery_status)
            .query(`
                UPDATE [EasyClaim_Dev].[dbo].[Delivery]
                SET 
                    claim_id = @claim_id,
                    driver_id = @driver_id,
                    delivery_status = @delivery_status,
                    receive_date = GETDATE()
                WHERE
                    delivery_id=@delivery_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: false,
                message: "Delivery not found"
            });
        }
        res.json({
            status: true,
            message: "Updata Success"
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

exports.DelDelivery = async (req, res) => {
    try {
        const { delivery_id } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("delivery_id", sql.Int, delivery_id)
            .query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[Delivery]
                WHERE delivery_id=@delivery_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: false,
                message: "Delivery not found"
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