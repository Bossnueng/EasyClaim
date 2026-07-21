const express = require("express");
const router = express.Router();

const rolesController = require("../controllers/rolesController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET
router.get("/role",rolesController.getRole );


// INSERT
router.post("/role", rolesController.createRole);


module.exports = router;