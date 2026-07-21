const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET
router.get("/users", userController.getUsers);


// INSERT
router.post("/users", userController.createUser);

//Delete
router.delete("/delusers",userController.deluser);


module.exports = router;