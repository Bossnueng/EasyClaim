const express = require("express");
const router = express.Router();

const loginController=require("../controllers/loginController");


// INSERT
router.post("/checklogin", loginController.checklogin);

module.exports = router;