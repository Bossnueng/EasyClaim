const express = require("express");
const router = express.Router();

const signatureController = require("../controllers/signatureController");
const { singleSignatureFile } = require("../middleware/uploadSignature");

router.get("/getWarehouseSignatures", signatureController.getWarehouseSignatures);
router.get("/getWarehouseSignatureHistory", signatureController.getWarehouseSignatureHistory);

router.post("/warehouseSignature", singleSignatureFile, signatureController.saveWarehouseSignature);

router.delete("/delWarehouseSignature", signatureController.delWarehouseSignature);

module.exports = router;
