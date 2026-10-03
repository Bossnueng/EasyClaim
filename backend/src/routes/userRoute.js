const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET
router.get("/users", userController.getUsers);
router.get("/user/:user_id", userController.getUserAgents);


// INSERT
router.post("/users", userController.createUser);
router.post("/user_agents",userController.user_agents);

//Delete
router.delete("/delusers",userController.deluser);


module.exports = router;