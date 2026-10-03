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


exports.getUserAgents = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({
                status: false,
                message: "กรุณาระบุ user_id"
            });
        }

        const pool = await connectDB();

        const result = await pool.request()
            .input("user_id", sql.Int, user_id)
            .query(`
                SELECT
                    ua.user_id,
                    ua.agent_id,
                    a.agent_name
                FROM [EasyClaim_Dev].[dbo].[user_agents] ua
                LEFT JOIN [EasyClaim_Dev].[dbo].[agents] a
                    ON ua.agent_id = a.agent_id
                WHERE ua.user_id = @user_id
                ORDER BY ua.agent_id
            `);

        res.json({
            status: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get User Agents Error:", error);

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
            .query(`

                INSERT INTO [EasyClaim_Dev].[dbo].[users]
                (
                    username,
                    password_hash,
                    full_name,
                    email,
                    phone,
                    role_id,
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

        if (!user_id) {
            return res.status(400).json({
                status: false,
                message: "กรุณาระบุ user_id"
            });
        }

        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // ==========================================
            // 1. ลบ Agent ที่ผูกกับ User
            // ==========================================
            await transaction.request()
                .input("user_id", sql.Int, user_id)
                .query(`
                    DELETE FROM [EasyClaim_Dev].[dbo].[user_agents]
                    WHERE user_id = @user_id
                `);

            // ==========================================
            // 2. ลบ User
            // ==========================================
            const result = await transaction.request()
                .input("user_id", sql.Int, user_id)
                .query(`
                    DELETE FROM [EasyClaim_Dev].[dbo].[users]
                    WHERE user_id = @user_id
                `);

            // ตรวจสอบว่ามี User ถูกลบจริงหรือไม่
            if (result.rowsAffected[0] === 0) {
                await transaction.rollback();

                return res.status(404).json({
                    status: false,
                    message: "ไม่พบ user_id นี้",
                    user_id: user_id
                });
            }

            await transaction.commit();

            res.json({
                status: true,
                message: "Delete Success",
                user_id: user_id
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Delete User Error:", error);

        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

exports.user_agents = async (req, res) => {
    try {
        const {
            user_id,
            agent_id
        } = req.body;
        const pool = await connectDB();
        const result = await pool.request()

            .input("user_id", sql.Int, user_id)
            .input("agent_id", sql.Int, agent_id)
            .query(`

                INSERT INTO [EasyClaim_Dev].[dbo].[user_agents]
                (
                    user_id,
                    agent_id
                )
                VALUES
                (
                    @user_id,
                    @agent_id
                );
            `);

        res.json({

            status: true,
            message: "Insert Success",
        });

    } catch (error) {
        console.error("add user_agents Error:", error);

        res.status(500).json({
            status: false,
            message: error.message
        });
    }
}





