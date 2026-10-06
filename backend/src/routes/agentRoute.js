const express = require("express");
const router = express.Router();
const AgentController = require("../controllers/agentController");
const { verifyToken } = require("../middleware/authMiddleware");
//GET
router.get("/getagent",AgentController.getagent);

router.post("/agent",AgentController.createAgent);
router.put("/updateAgent",AgentController.updateAgent);


module.exports = router;