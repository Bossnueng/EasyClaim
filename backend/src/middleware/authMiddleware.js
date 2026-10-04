const jwt = require("jsonwebtoken");
require('dotenv').config();

const pool = require("../config/db");

const verifyToken = async (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "No Token"
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        //เพิ่ม
        const userResult = await pool.query(
            "SELECT id, username, agent_ids, role FROM users WHERE id = $1", 
            [decoded.id]
        );

        const currentUser = userResult.rows[0];

        if (!currentUser) {
            return res.status(401).json({
                message: "User no longer exists"
            });
        }


        //req.user = decoded;
        req.user = currentUser;


        next();

    } catch (err) {

        return res.status(401).json({
            message: "Invalid Token"
        });

    }

};

module.exports = verifyToken;