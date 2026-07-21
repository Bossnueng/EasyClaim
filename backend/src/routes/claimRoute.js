const express = require("express");
const router = express.Router();

const ClaimController = require("../controllers/claimController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET
router.get("/getClaim",ClaimController.getClaim);
router.get("/getclaimstatuslog",ClaimController.getclaimstatuslog);
router.get("/getclaimapproves",ClaimController.getclaimapproves);


// INSERT
router.post("/Claim", ClaimController.creartClaim);
router.post("/ClaimStatusLogs", ClaimController.createClaimStatusLogs);
router.post("/Claimapproves", ClaimController.createClaimapproves);
router.post("/Claimimage", ClaimController.createClaimimage);
router.post("/updateClaim", ClaimController.updateClaim);

//Delete
router.delete("/delClaim", ClaimController.delClaim);
router.delete("/delClaimApprove", ClaimController.delClaimApprove);
router.delete("/delClaimImages", ClaimController.delClaimImages);
router.delete("/deleteClaimimage", ClaimController.deleteClaimimage);



module.exports = router;