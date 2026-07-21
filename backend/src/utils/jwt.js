const jwt = require("jsonwebtoken");
require('dotenv').config();
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.user_id,
            username: user.username,
            role: user.role_id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES
        }
    );
};

module.exports = {
    generateToken
};