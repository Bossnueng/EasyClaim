const { sql, connectDB } = require("../config/db");
const bcrypt = require("bcrypt");

// =========================
// SELECT USERS
// =========================

exports.getUsers = async (req, res) => {

    try {

        const pool = await connectDB();


        const result = await pool.request()
            .query(`
                SELECT 
                     [user_id]
                    ,[username]
                    ,[password_hash]
                    ,[full_name]
                    ,[email]
                    ,[phone]
                    ,[role_id]
                    ,[agent_id]
                    ,[status]
                    ,[last_login]
                    ,[created_at]
                    ,[updated_at]
                FROM [EasyClaim_Dev].[dbo].[users]
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
exports.createUser = async (req, res) => {

    try {


        const {
            username,
            password,
            full_name,
            email,
            phone,
            role_id,
            agent_id
        } = req.body;
        // จำนวนรอบการเข้ารหัส
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        const pool = await connectDB();



        const result = await pool.request()

            .input("username", sql.VarChar, username)
            .input("password_hash", sql.VarChar, password_hash)
            .input("full_name", sql.NVarChar, full_name)
            .input("email", sql.VarChar, email)
            .input("phone", sql.VarChar, phone)
            .input("role_id", sql.Int, role_id)
            .input("agent_id", sql.Int, agent_id)

            .query(`

                INSERT INTO [EasyClaim_Dev].[dbo].[users]
                (
                    username,
                    password_hash,
                    full_name,
                    email,
                    phone,
                    role_id,
                    agent_id,
                    status,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    @username,
                    @password_hash,
                    @full_name,
                    @email,
                    @phone,
                    @role_id,
                    @agent_id,
                    1,
                    GETDATE(),
                    GETDATE()
                );


                SELECT SCOPE_IDENTITY() AS user_id;

            `);



        res.json({

            status: true,
            message: "Insert Success",
            user_id: result.recordset[0].user_id

        });



    } catch (error) {


        res.status(500).json({

            status: false,
            message: error.message

        });


    }

};

exports.deluser = async (req, res) => {
    try {
        const { user_id } = req.body;
        const pool = await connectDB();
        const result = await pool.request()

            .input("user_id", sql.Int, user_id)
            .query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[users]
                WHERE user_id=@user_id
            `);
        res.json({

            status: true,
            message: "Delete Success",
            user_id: user_id

        });
    } catch (error) {
        res.status(500).json({

            status: false,
            message: error.message

        });
    }
}

