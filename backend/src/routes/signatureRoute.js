const express = require("express");
const router = express.Router();

const signatureController = require("../controllers/signatureController");
const { singleSignatureFile } = require("../middleware/uploadSignature");

// GET
router.get("/getWarehouseSignatures", signatureController.getWarehouseSignatures);

// POST (Upsert ตาม warehouse) — multipart: warehouse, reviewer_name, updated_by, file
router.post("/warehouseSignature", singleSignatureFile, signatureController.saveWarehouseSignature);

// DELETE — body: { warehouse, updated_by }
router.delete("/delWarehouseSignature", signatureController.delWarehouseSignature);

module.exports = router;
