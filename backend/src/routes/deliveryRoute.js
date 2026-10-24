const express = require("express");
const router = express.Router();

const deliveryController = require("../controllers/deliveryController");
const uploadClaimReturn = require("../middleware/uploadClaimReturn");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/getDelivery", deliveryController.Delivery);

router.post("/createDelivery", deliveryController.createDelivery);
router.post("/UpdataDelivery", deliveryController.UpdataDelivery);
router.post("/DeliveryDriver", deliveryController.DeliveryDriver);
router.post(
    "/delivery",
    uploadClaimReturn.single("image"),
    deliveryController.createDelivery
);

router.delete("/DelDelivery", deliveryController.DelDelivery);

module.exports = router;
