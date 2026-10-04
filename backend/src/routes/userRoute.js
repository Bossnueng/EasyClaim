const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET
router.get("/users", userController.getUsers);


// INSERT
router.post("/users", userController.createUser);

//Delete
router.delete("/delusers/:id", userController.deluser);
router.delete("/delusers", userController.deluser);

// Delete (Soft Delete) - รองรับทั้งแบบส่ง ID ผ่าน URL และส่งผ่าน Body
router.delete("/deleteusers/:id", userController.deleteuser);
router.delete("/deleteusers", userController.deleteuser);

// บรรทัดสำคัญ: เพิ่มหรือแก้ไขให้รองรับ PUT /users/:id และ PUT /users
router.put('/users/:id', userController.updateUser);
router.put('/users', userController.updateUser);


module.exports = router;