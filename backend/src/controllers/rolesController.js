const { sql, connectDB } = require("../config/db");



// =========================
// SELECT USERS
// =========================

exports.getRole = async (req, res) => {

    try {

        const pool = await connectDB();


        const result = await pool.request()
            .query(`
                SELECT [role_id]
      ,[role_name]
      ,[description]
  FROM [EasyClaim_Dev].[dbo].[roles]
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




// =========================
// INSERT USERS
// =========================
exports.createRole = async (req, res) => {

    try {


        const {
            role_name,
            description
        } = req.body;



        const pool = await connectDB();



        const result = await pool.request()

            .input("role_name", sql.VarChar, role_name)
            .input("description", sql.NVarChar, description)


            .query(`

                INSERT INTO [EasyClaim_Dev].[dbo].[roles]
                (
                    role_name,
                    description
                )
                VALUES
                (
                    @role_name,
                    @description
                );
 SELECT SCOPE_IDENTITY() AS role_id;
            `);



        res.json({

            status: true,
            message: "Insert Success",
            role_id: result.recordset[0].role_id

        });



    } catch (error) {



        res.status(500).json({
            status: false,
            message: error.message
        });


    }

};

exports.updateRole = async (req, res) => {
    try {
        const { id, role_name, description } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("role_id", sql.Int, id)
            .input("role_name", sql.VarChar, role_name)
            .input("description", sql.NVarChar, description)


            .query(`
UPDATE [EasyClaim_Dev].[dbo].[roles]
SET 
    role_name=@role_name,
    description=@description
WHERE role_id=@role_id
            `);

        res.json({
            status: true,
            message: "Update Success",
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}

// =========================
// DELETE ROLE
// =========================
exports.deleteRole = async (req, res) => {
    try {
        // รับค่า id จาก req.params (กรณีส่งผ่าน URL เช่น /api/roles/1) 
        // หรือ req.body (กรณีส่งเป็น JSON body)
        const role_id = req.params.id || req.body.id;

        if (!role_id) {
            return res.status(400).json({
                status: false,
                message: "Please provide role_id"
            });
        }

        const pool = await connectDB();

        const result = await pool.request()
            .input("role_id", sql.Int, role_id)
            .query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[roles]
                WHERE role_id = @role_id
            `);

        // ตรวจสอบว่ามีการลบแถวข้อมูลจริงหรือไม่
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: false,
                message: "Role not found"
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