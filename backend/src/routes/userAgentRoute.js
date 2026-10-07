// src/routes/userAgentRoute.js
const express = require("express");
const router = express.Router();
const userAgentController = require("../controllers/userAgentController");

// ดึงรายการ Agent ของ User / ดึงรายการ User ของ Agent
router.get("/user-agents/user/:userId", userAgentController.getAgentsByUserId);
router.get("/user-agents/agent/:agentId", userAgentController.getElementsByAgentId);

// เพิ่ม / อัปเดต / ลบ ความสัมพันธ์
router.post("/user-agents", userAgentController.assignAgentsToUser);
router.put("/user-agents", userAgentController.updateUserAgents);
router.delete("/user-agents", userAgentController.removeAgentFromUser);

module.exports = router;