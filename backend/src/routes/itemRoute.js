const express = require("express");
const router = express.Router();

const itemController = require("../controllers/itemController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET
router.get("/getitem",itemController.getitem );


// INSERT
router.post("/item", itemController.createitem);
router.post("/itemupdate", itemController.updataitem);

//Delete
router.delete("/itemdeleteall", itemController.delItem);



module.exports = router;