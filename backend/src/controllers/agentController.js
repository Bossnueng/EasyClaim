const { sql, connectDB } = require("../config/db");

exports.getagent = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT [agent_id], [agent_code], [agent_name], [teams_webhook_url], [status], [created_at]
            FROM [EasyClaim_Dev].[dbo].[agents]
        `);

        res.json({ status: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.createAgent = async (req, res) => {
    try {
        const { agent_code, agent_name, teams_webhook_url } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input("agent_code", sql.NVarChar, agent_code)
            .input("agent_name", sql.NVarChar, agent_name)
            .input("teams_webhook_url", sql.NVarChar, teams_webhook_url || null)
            .input("status", sql.Int, 1)
            .query(`
                INSERT INTO [EasyClaim_Dev].[dbo].[agents] (agent_code, agent_name, teams_webhook_url, status, created_at)
                VALUES (@agent_code, @agent_name, @teams_webhook_url, @status, GETDATE());

                SELECT SCOPE_IDENTITY() AS agent_id;
            `);

        res.json({ status: true, message: "Insert Success", agent_id: result.recordset[0].agent_id });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.updateAgent = async (req, res) => {
    try {
        const { agent_id, agent_code, agent_name, teams_webhook_url, status } = req.body;
        const pool = await connectDB();

        await pool.request()
            .input("agent_id", sql.Int, agent_id)
            .input("agent_code", sql.NVarChar, agent_code)
            .input("agent_name", sql.NVarChar, agent_name)
            .input("teams_webhook_url", sql.NVarChar, teams_webhook_url || null)
            .input("status", sql.Int, status)
            .query(`
                UPDATE [EasyClaim_Dev].[dbo].[agents]
                SET agent_code=@agent_code, agent_name=@agent_name, teams_webhook_url=@teams_webhook_url, status=@status
                WHERE agent_id=@agent_id
            `);

        res.json({ status: true, message: "Update Success", agent_id });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.deleteAgent = async (req, res) => {
    try {
        const agent_id = req.params.id || req.body.agent_id;
        const pool = await connectDB();

        await pool.request()
            .input("agent_id", sql.Int, agent_id)
            .query(`DELETE FROM [EasyClaim_Dev].[dbo].[user_agents] WHERE agent_id=@agent_id`);

        await pool.request()
            .input("agent_id", sql.Int, agent_id)
            .query(`DELETE FROM [EasyClaim_Dev].[dbo].[agents] WHERE agent_id=@agent_id`);

        res.json({ status: true, message: "Delete Success", agent_id });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};