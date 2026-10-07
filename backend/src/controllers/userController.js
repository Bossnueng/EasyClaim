const { sql, connectDB } = require("../config/db");
const bcrypt = require("bcrypt");

// SELECT USERS
exports.getUsers = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT 
                u.[user_id],
                u.[username],
                u.[full_name],
                u.[email],
                u.[phone],
                u.[role_id],
                u.[status],
                u.[last_login],
                u.[created_at],
                u.[updated_at],
                STRING_AGG(ua.[agent_id], ',') AS agent_ids_str
            FROM [EasyClaim_Dev].[dbo].[users] u
            LEFT JOIN [EasyClaim_Dev].[dbo].[user_agents] ua ON u.user_id = ua.user_id
            GROUP BY 
                u.[user_id], u.[username], u.[full_name], u.[email], 
                u.[phone], u.[role_id], u.[status], u.[last_login], 
                u.[created_at], u.[updated_at]
        `);

        const formattedData = result.recordset.map(user => {
            const agent_ids = user.agent_ids_str ? user.agent_ids_str.split(',').map(Number) : [];
            const { agent_ids_str, ...rest } = user;
            return { ...rest, agent_ids };
        });

        res.json({ status: true, data: formattedData });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

// INSERT USER
exports.createUser = async (req, res) => {
    try {
        const { username, password, full_name, email, phone, role_id, agent_ids } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
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
                (username, password_hash, full_name, email, phone, role_id, status, created_at, updated_at)
                VALUES (@username, @password_hash, @full_name, @email, @phone, @role_id, 1, GETDATE(), GETDATE());

                SELECT SCOPE_IDENTITY() AS user_id;
            `);

        const newUserId = result.recordset[0].user_id;

        if (Array.isArray(agent_ids) && agent_ids.length > 0) {
            for (const agentId of agent_ids) {
                await pool.request()
                    .input("user_id", sql.Int, newUserId)
                    .input("agent_id", sql.Int, agentId)
                    .query(`INSERT INTO [EasyClaim_Dev].[dbo].[user_agents] (user_id, agent_id) VALUES (@user_id, @agent_id);`);
            }
        }

        res.json({ status: true, message: "Insert Success", user_id: newUserId });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
    try {
        const user_id = req.params.id || req.body.user_id;
        const { username, password, full_name, email, phone, role_id, agent_ids } = req.body;
        const pool = await connectDB();

        if (password) {
            const password_hash = await bcrypt.hash(password, 10);
            await pool.request()
                .input("user_id", sql.Int, user_id)
                .input("username", sql.VarChar, username)
                .input("password_hash", sql.VarChar, password_hash)
                .input("full_name", sql.NVarChar, full_name)
                .input("email", sql.VarChar, email)
                .input("phone", sql.VarChar, phone)
                .input("role_id", sql.Int, role_id)
                .query(`
                    UPDATE [EasyClaim_Dev].[dbo].[users]
                    SET username=@username, password_hash=@password_hash, full_name=@full_name,
                        email=@email, phone=@phone, role_id=@role_id, updated_at=GETDATE()
                    WHERE user_id=@user_id;
                `);
        } else {
            await pool.request()
                .input("user_id", sql.Int, user_id)
                .input("username", sql.VarChar, username)
                .input("full_name", sql.NVarChar, full_name)
                .input("email", sql.VarChar, email)
                .input("phone", sql.VarChar, phone)
                .input("role_id", sql.Int, role_id)
                .query(`
                    UPDATE [EasyClaim_Dev].[dbo].[users]
                    SET username=@username, full_name=@full_name,
                        email=@email, phone=@phone, role_id=@role_id, updated_at=GETDATE()
                    WHERE user_id=@user_id;
                `);
        }

        if (Array.isArray(agent_ids)) {
            await pool.request()
                .input("user_id", sql.Int, user_id)
                .query(`DELETE FROM [EasyClaim_Dev].[dbo].[user_agents] WHERE user_id=@user_id;`);

            for (const agentId of agent_ids) {
                await pool.request()
                    .input("user_id", sql.Int, user_id)
                    .input("agent_id", sql.Int, agentId)
                    .query(`INSERT INTO [EasyClaim_Dev].[dbo].[user_agents] (user_id, agent_id) VALUES (@user_id, @agent_id);`);
            }
        }

        // 🟢 เพิ่ม: ส่ง Socket Event เมื่อทำการอัปเดตข้อมูลสำเร็จ
        const io = req.app.get("io");
        if (io) {
            // ส่งแจ้งเตือนไปยัง Room ของ User คนดังกล่าว (หรือ broadcast ถ้าใช้ room เดียวกัน)
            io.emit("user:updated", { user_id, agent_ids });
        }

        res.json({ status: true, message: "Update Success", user_id });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

// DELETE USER
exports.deluser = async (req, res) => {
    try {
        const user_id = req.params.id || req.body.user_id;
        const pool = await connectDB();

        await pool.request()
            .input("user_id", sql.Int, user_id)
            .query(`DELETE FROM [EasyClaim_Dev].[dbo].[user_agents] WHERE user_id=@user_id`);

        await pool.request()
            .input("user_id", sql.Int, user_id)
            .query(`DELETE FROM [EasyClaim_Dev].[dbo].[users] WHERE user_id=@user_id`);

        res.json({ status: true, message: "Delete Success", user_id });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.deleteuser = async (req, res) => {
    try {
        const user_id = req.params.id || req.body.user_id;
        const pool = await connectDB();

        // อัปเดต status เป็น 0 เพื่อปิดใช้งาน โดยไม่ต้องลบข้อมูลออกจาก Database
        await pool.request()
            .input("user_id", sql.Int, user_id)
            .input("agent_id", sql.Int, agent_id)
            .query(`
                UPDATE [EasyClaim_Dev].[dbo].[users] 
                SET status = 0, updated_at = GETDATE() 
                WHERE user_id = @user_id
            `);

        res.json({ status: true, message: "ปิดการใช้งานผู้ใช้เรียบร้อยแล้ว", user_id });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}
