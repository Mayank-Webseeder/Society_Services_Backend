const express = require("express");
const router = express.Router();
const {
  applyToJob,
  showInterestInJob,
  getJobApplicants,
  approveApplication,
  markJobComplete,
  getVendorApplicationType
} = require("../controllers/applicationController");

const { authMiddleware } = require("../middleware/authMiddleware");

// 🔹 Vendor shows interest (without quotation)
router.post("/:id/interest", authMiddleware, showInterestInJob);

// 🔹 Vendor applies with quotation only
router.post("/:id/apply", authMiddleware, applyToJob);

// 🔹 Society views all vendor applicants for a job
router.get("/:id/applicants", authMiddleware, getJobApplicants);

// ✅ Society approves a vendor application
router.post("/:applicationId/approve", authMiddleware, approveApplication);

// ✅ Society marks job as completed
router.post("/job/:jobId/complete", authMiddleware, markJobComplete);

// 🔹 Society checks what type of application a vendor submitted
router.get("/:jobId/vendor/:vendorId", authMiddleware, getVendorApplicationType);

module.exports = router;
