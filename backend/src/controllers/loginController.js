/*==================================
Detail : Fix resolve merge conflicts with main 2nd

๊Update by : Phonnapha.k
Date : 24/09/2026
==================================*/

const { sql, connectDB } = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { loginBlockedMessage } = require("../utils/userStatus");

exports.checklogin = async (req, res) => {
    try {

        // ช่องเดียวรับได้ทั้ง username (รหัสพนักงาน หรือชื่อผู้ใช้ที่คนนอกตั้งเอง) และ "อีเมล"
        // ยังรับชื่อ field username เหมือนเดิม เพื่อไม่กระทบหน้าเว็บ/ระบบที่เรียกอยู่
        const identifier = String(req.body.username ?? req.body.email ?? "").trim();
        const { password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                status: false,
                message: "กรุณากรอกรหัสพนักงาน ชื่อผู้ใช้ หรืออีเมล และรหัสผ่าน"
            });
        }

        const pool = await connectDB();

        // ถ้ามีทั้ง username และ email ที่ตรงกัน ให้ username มาก่อน
        const result = await pool.request()
            .input("identifier", sql.NVarChar(150), identifier)
            .query(`
                SELECT
                    user_id,
                    username,
                    password_hash,
                    full_name,
                    email,
                    role_id,
                    status
                FROM users
                WHERE username = @identifier OR email = @identifier
                ORDER BY (username = @identifier) DESC, user_id ASC
                LIMIT 1
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                status: false,
                message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            });
        }

        const user = result.recordset[0];

        // ตรวจสอบรหัสผ่านก่อน แล้วค่อยบอกสถานะบัญชี (ไม่บอกสถานะให้คนที่ไม่รู้รหัสผ่าน)
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            const blocked = loginBlockedMessage(user.status);
            if (blocked) {
                return res.status(403).json({ status: false, message: blocked });
            }
        }

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
                FROM user_agents 
                WHERE user_id = @user_id
            `);

        // แปลงผลลัพธ์ให้อยู่ในรูป Array เช่น [1, 2, 3]
        const agent_ids = agentResult.recordset.map(row => row.agent_id);

        // อัปเดตเวลา Login ล่าสุด
        await pool.request()
            .input("user_id", sql.Int, user.user_id)
            .query(`
                UPDATE users
                SET last_login = NOW()
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