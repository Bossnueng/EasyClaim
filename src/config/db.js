const sql=require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        useUTC: false
    }
};

const connectDB = async () => {
    try {
        const pool = await sql.connect(config);
        console.log("✅ SQL Server Connected");
        return pool;
    } catch (err) {
        console.error("❌ SQL Server Connection Error:", err);
    }
};

module.exports = {
    connectDB,
    sql
};