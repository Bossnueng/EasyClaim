// src/controllers/userAgentController.js
const { sql, connectDB } = require("../config/db");

// 1. ดึง Agent ทั้งหมดที่ User คนนี้ดูแลอยู่
exports.getAgentsByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await connectDB();

        const result = await pool.request()
            .input("user_id", sql.Int, userId)
            .query(`
                SELECT a.[agent_id], a.[agent_code], a.[agent_name], a.[status]
                FROM [EasyClaim_Dev].[dbo].[user_agents] ua
                INNER JOIN [EasyClaim_Dev].[dbo].[agents] a ON ua.agent_id = a.agent_id
                WHERE ua.user_id = @user_id
            `);

        res.json({
            status: true,
            data: result.recordset
        });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

// 2. ดึง User ทั้งหมดที่ดูแล Agent นี้อยู่
exports.getElementsByAgentId = async (req, res) => {
    try {
        const { agentId } = req.params;
        const pool = await connectDB();

        const result = await pool.request()
            .input("agent_id", sql.Int, agentId)
            .query(`
                SELECT u.[user_id], u.[username], u.[full_name], u.[email], u.[phone]
                FROM [EasyClaim_Dev].[dbo].[user_agents] ua
                INNER JOIN [EasyClaim_Dev].[dbo].[users] u ON ua.user_id = u.user_id
                WHERE ua.agent_id = @agent_id
            `);

        res.json({
            status: true,
            data: result.recordset
        });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

// 3. ผูก Agent เพิ่มให้ User (Insert Single หรือ Multiple)
exports.assignAgentsToUser = async (req, res) => {
    try {
        const { user_id, agent_ids } = req.body; // agent_ids รับเป็น Array [1, 2, 3]

        if (!user_id || !Array.isArray(agent_ids)) {
            return res.status(400).json({
                status: false,
                message: "กรุณาระบุ user_id และ agent_ids (Array)"
            });
        }

        const pool = await connectDB();

        for (const agentId of agent_ids) {
            // ใช้ MERGE / NOT EXISTS เพื่อป้องกันการสร้าง Duplicate Primary Key (user_id, agent_id)
            await pool.request()
                .input("user_id", sql.Int, user_id)
                .input("agent_id", sql.Int, agentId)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM [EasyClaim_Dev].[dbo].[user_agents] 
                        WHERE user_id = @user_id AND agent_id = @agent_id
                    )
                    BEGIN
                        INSERT INTO [EasyClaim_Dev].[dbo].[user_agents] (user_id, agent_id)
                        VALUES (@user_id, @agent_id)
                    END
                `);
        }

        res.json({
            status: true,
            message: "บันทึกการมอบหมาย Agent เรียบร้อยแล้ว"
        });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

// 4. อัปเดตรายการ Agent ทั้งหมดของ User (ลบของเก่าทิ้งแล้วใส่รายการใหม่ทั้งหมด)
exports.updateUserAgents = async (req, res) => {
    try {
        const { user_id, agent_ids } = req.body; // agent_ids: [1, 2, 3]

        if (!user_id || !Array.isArray(agent_ids)) {
            return res.status(400).json({
                status: false,
                message: "กรุณาระบุ user_id และ agent_ids (Array)"
            });
        }

        const pool = await connectDB();

        // Step A: ลบ Mapping เดิมของ User รายนี้ออกทั้งหมด
        await pool.request()
            .input("user_id", sql.Int, user_id)
            .query(`DELETE FROM [EasyClaim_Dev].[dbo].[user_agents] WHERE user_id = @user_id;`);

        // Step B: เพิ่มรายการใหม่ที่เลือกเข้ามา
        for (const agentId of agent_ids) {
            await pool.request()
                .input("user_id", sql.Int, user_id)
                .input("agent_id", sql.Int, agentId)
                .query(`
                    INSERT INTO [EasyClaim_Dev].[dbo].[user_agents] (user_id, agent_id)
                    VALUES (@user_id, @agent_id);
                `);
        }

        res.json({
            status: true,
            message: "อัปเดตเอเย่นต์ที่ดูแลสำเร็จ"
        });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

// 5. ยกเลิกการผูก Agent เฉพาะรายตัวออก
exports.removeAgentFromUser = async (req, res) => {
    try {
        const { user_id, agent_id } = req.body;
        const pool = await connectDB();

        await pool.request()
            .input("user_id", sql.Int, user_id)
            .input("agent_id", sql.Int, agent_id)
            .query(`
                DELETE FROM [EasyClaim_Dev].[dbo].[user_agents]
                WHERE user_id = @user_id AND agent_id = @agent_id;
            `);

        res.json({
            status: true,
            message: "ยกเลิกสิทธิ์ดูแล Agent เรียบร้อยแล้ว"
        });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};