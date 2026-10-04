/*==================================
Detail : Fix resolve merge conflicts with main 2nd

๊Update by : Phonnapha.k
Date : 24/09/2026
==================================*/

const { sql, connectDB } = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.checklogin = async (req, res) => {
    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                status: false,
                message: "กรุณากรอก Username และ Password"
            });
        }

        const pool = await connectDB();

        const result = await pool.request()
            .input("username", sql.NVarChar(100), username)
            .query(`
                SELECT
                    user_id,
                    username,
                    password_hash,
                    full_name,
                    email,
                    role_id,
                    status
                FROM [EasyClaim_Dev].[dbo].[users]
                WHERE username = @username
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                status: false,
                message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            });
        }

        const user = result.recordset[0];

        if (user.status === 0) {
            return res.status(403).json({
                status: false,
                message: "บัญชีผู้ใช้นี้ถูกปิดการใช้งาน"
            });
        }

        // ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                status: false,
                message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            });
        }

        // 2. ดึง agent_id ทั้งหมดจากตาราง user_agents แบบแยก Query (อ่านและเข้าใจง่าย)
        const agentResult = await pool.request()
            .input("user_id", sql.Int, user.user_id)
            .query(`
                SELECT agent_id 
                FROM [EasyClaim_Dev].[dbo].[user_agents] 
                WHERE user_id = @user_id
            `);

        // แปลงผลลัพธ์ให้อยู่ในรูป Array เช่น [1, 2, 3]
        const agent_ids = agentResult.recordset.map(row => row.agent_id);

        // อัปเดตเวลา Login ล่าสุด
        await pool.request()
            .input("user_id", sql.Int, user.user_id)
            .query(`
                UPDATE [EasyClaim_Dev].[dbo].[users]
                SET last_login = GETDATE()
                WHERE user_id = @user_id
            `);

        // สร้าง JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                role_id: user.role_id,
                agent_ids: agent_ids
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            status: true,
            message: "Login Success",
            token: token,
            data: {
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                email: user.email,
                role_id: user.role_id,
                agent_ids: agent_ids
            }
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};