const { sql, connectDB } = require("../config/db");

exports.getitem = async (req, res) => {
    try {
        const pool = await connectDB();


        const result = await pool.request()
            .query(`
                SELECT [item_id]
      ,[item_code]
      ,[item_name]
      ,[status]
      ,[created_at]
      ,[updated_at]
  FROM [EasyClaim_Dev].[dbo].[items]
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

exports.createitem = async (req, res) => {
    try {

        const {
            item_code,
            item_name,
        } = req.body;
        const status = '1';
        const pool = await connectDB();
        const result = await pool.request()
            .input("item_code", sql.VarChar, item_code)
            .input("item_name", sql.NVarChar, item_name)
            .input("status", sql.NVarChar, status)
            .query(`

                INSERT INTO [EasyClaim_Dev].[dbo].[items]
                (
                    item_code,
                    item_name,
                    status,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    @item_code,
                    @item_name,
                    @status,
                    GETDATE(),
                    GETDATE()
                );
 SELECT SCOPE_IDENTITY() AS item_id;
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

exports.updataitem = async (req, res) => {
    try {
        const { id, item_code, item_name, status } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("item_id", sql.Int, id)
            .input("item_code", sql.VarChar, item_code)
            .input("item_name", sql.VarChar, item_name)
            .input("status", sql.VarChar, status)
            .query(`
        UPDATE items
        SET
            item_code = @item_code,
            item_name = @item_name,
            status = @status,
            updated_at=GETDATE()
        WHERE item_id = @item_id
    `);

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
}

exports.delItem = async (req, res) => {
    try {
        const { ids } = req.body;
        console.log('req', ids);
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                status: false,
                message: "กรุณาส่ง ids"
            });
        }

        const pool = await connectDB();
        const request = pool.request();

        const params = ids.map((id, index) => {
            request.input(`id${index}`, sql.Int, id);
            return `@id${index}`;
        });

        await request.query(`
            DELETE FROM [EasyClaim_Dev].[dbo].[items]
            WHERE item_id IN (${params.join(",")})
        `);

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

