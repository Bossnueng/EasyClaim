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

exports.createDelivery = async (req, res) => {
    try {
        const { 
            claim_id, 
            driver_id, 
            delivery_status, 
            driver_name, 
            truck_plate, 
            estimated_delivery_date, 
            claim_no 
        } = req.body;

        const pool = await connectDB();

        // 1. บันทึกข้อมูลลงตาราง Delivery
        const deliveryResult = await pool.request()
            .input("claim_id", sql.Int, claim_id)
            .input("driver_id", sql.VarChar, driver_id ? String(driver_id) : null)
            .input("delivery_status", sql.VarChar, delivery_status)
            .query(`
                INSERT INTO [EasyClaim_Dev].[dbo].[Delivery]
                (
                    claim_id,
                    driver_id,
                    delivery_status,
                    receive_date
                )
                VALUES
                (
                    @claim_id,
                    @driver_id,
                    @delivery_status,
                    GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS delivery_id;
            `);

        // 2. อัปเดตข้อมูลรายละเอียด พขร./รถ/วันจัดส่ง กลับไปยังตาราง Claims ตามประเภทสถานะ
        if (delivery_status === "4") {
            // กรณี "รับสินค้าจริงแล้ว"
            await pool.request()
                .input("claim_id", sql.Int, claim_id)
                .input("driver_name", sql.NVarChar, driver_name || null)
                .input("truck_plate", sql.NVarChar, truck_plate || null)
                .input("claim_no", sql.NVarChar, claim_no || null)
                .query(`
                    UPDATE [EasyClaim_Dev].[dbo].[Claims]
                    SET 
                        driver_name = ISNULL(@driver_name, driver_name),
                        truck_plate = ISNULL(@truck_plate, truck_plate),
                        claim_no = ISNULL(@claim_no, claim_no)
                    WHERE claim_id = @claim_id
                `);
        } else if (delivery_status === "9") {
            // กรณี "กำลังจัดส่งสินค้าเคลม"
            await pool.request()
                .input("claim_id", sql.Int, claim_id)
                .input("delivery_driver", sql.NVarChar, driver_name || null)
                .input("delivery_plate", sql.NVarChar, truck_plate || null)
                .input("estimated_delivery_date", sql.Date, estimated_delivery_date || null)
                .query(`
                    UPDATE [EasyClaim_Dev].[dbo].[Claims]
                    SET 
                        delivery_driver = ISNULL(@delivery_driver, delivery_driver),
                        delivery_plate = ISNULL(@delivery_plate, delivery_plate),
                        estimated_delivery_date = ISNULL(@estimated_delivery_date, estimated_delivery_date)
                    WHERE claim_id = @claim_id
                `);
        }

        res.json({
            status: true,
            message: "Insert & Update Claims Success",
            delivery_id: deliveryResult.recordset[0].delivery_id
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