const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

const registrationController = require("../controllers/registrationController");

// สมัครใช้งานผ่านหน้าเว็บ (สถานะรออนุมัติ) + admin อนุมัติ/ไม่อนุมัติ
router.post("/register", registrationController.register);
router.get("/users/pending-count", registrationController.getPendingCount);
router.put("/users/:id/approve", registrationController.approveUser);
router.put("/users/:id/reject", registrationController.rejectUser);

// GET
router.get("/users", userController.getUsers);

//router.get("/user/:user_id", userController.getUserAgents);


// INSERT
router.post("/users", userController.createUser);

//router.post("/user_agents",userController.user_agents);

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