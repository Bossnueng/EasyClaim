const express = require("express");
const router = express.Router();

const ClaimController = require("../controllers/claimController");
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/uplodad");

// GET
router.get("/getClaim", ClaimController.getClaim);
router.get("/getClaimItems/:claim_id", ClaimController.getClaimItems);
router.get("/getclaimstatuslog", ClaimController.getclaimstatuslog);
router.get("/getclaimapproves", ClaimController.getclaimapproves);
router.get("/getClaimImages/:claim_id", ClaimController.getClaimImages);
router.get("/getClaimByAgent/:agent_id", ClaimController.getClaimByAgent);

// POST
router.post("/Claim", upload.any(), ClaimController.creartClaim);
router.post("/ClaimStatusLogs", ClaimController.createClaimStatusLogs);
router.post("/Claimapproves", ClaimController.createClaimapproves);
router.post("/Claimimage", upload.single("file"), ClaimController.createClaimimage);
router.post("/updateClaim", ClaimController.updateclaim);

// DELETE
router.delete("/delClaim", ClaimController.delClaim);
router.delete("/delClaimApprove", ClaimController.delClaimApprove);
router.delete("/delClaimImages", ClaimController.delClaimImages);
router.delete("/deleteClaimimage", ClaimController.deleteClaimimage);

module.exports = router;