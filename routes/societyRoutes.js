const express = require("express");
const router = express.Router();

const {
  signupSociety,
  loginSociety,
} = require("../controllers/society/societyAuth");

const {
  getMyPostedJobs,
  getJobById,
} = require("../controllers/jobController");

const {
  getJobApplicants,
  approveApplication,
  markJobComplete,
  getVendorApplicationType
} = require("../controllers/applicationController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/roleBasedAuth");

const {
  rejectApplication,
  getApplicantCount,
} = require("../controllers/applicationController");

const { deleteJob } = require("../controllers/jobController");


// 🏠 Society → Reject Vendor Application
router.post(
  "/applications/:applicationId/reject",
  authenticate,
  authorizeRoles("society"),
  rejectApplication
);

// 🏠 Society → Delete Job (manual delete)
router.delete(
  "/jobs/:jobId/delete",
  authenticate,
  authorizeRoles("society"),
  deleteJob
);

// 🏠 Society → View Application Count Per Job
router.get(
  "/jobs/:jobId/applicant-count",
  authenticate,
  authorizeRoles("society"),
  getApplicantCount
);

// 🔐 Society Signup/Login
router.post("/signup", signupSociety);
router.post("/login", loginSociety);

// 🏠 Society Dashboard (protected)
router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("society"),
  (req, res) => {
    res.json({ msg: "Welcome to Society Dashboard", user: req.user });
  }
);

// 📄 View My Posted Jobs
router.get(
  "/jobs/posted",
  authenticate,
  authorizeRoles("society"),
  getMyPostedJobs
);

// 📄 View One Job by ID (to check status/details)
router.get(
  "/jobs/:id",
  authenticate,
  authorizeRoles("society"),
  getJobById
);

// 📌 View Applicants for a Job
router.get(
  "/jobs/:id/applicants",
  authenticate,
  authorizeRoles("society"),
  getJobApplicants
);

// ✅ Approve Vendor Application
router.post(
  "/applications/:applicationId/approve",
  authenticate,
  authorizeRoles("society"),
  approveApplication
);

// ✅ Mark Job as Completed
router.post(
  "/jobs/:jobId/complete",
  authenticate,
  authorizeRoles("society"),
  markJobComplete
);

// 👁️ View if a specific vendor applied/showed interest
router.get(
  "/jobs/:jobId/vendor/:vendorId",
  authenticate,
  authorizeRoles("society"),
  getVendorApplicationType
);

module.exports = router;
