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

exports.createDelivery = async (req, res) => {

    try {
        const { claim_id, driver_id, delivery_status } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("claim_id", sql.Int, claim_id)
            .input("driver_id", sql.VarChar, driver_id)
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
        res.json({
            status: true,
            message: "Insert Success",
            delivery_id: result.recordset[0].delivery_id
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }

}

exports.UpdataDelivery = async (req, res) => {

    try {
        const { delivery_id, claim_id, driver_id, delivery_status } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("delivery_id", sql.Int, delivery_id)
            .input("claim_id", sql.Int, claim_id)
            .input("driver_id", sql.VarChar, driver_id)
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

}

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

}