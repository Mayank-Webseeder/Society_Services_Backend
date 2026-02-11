const express = require("express");
const router = express.Router();

const {
  createJob,
  getNearbyJobs,
  getJobById,
  filterJobsByTypeAndDate,
  expireOldJobs,
  deleteJob,
  getNearbyJobsDebug,
  getAllJobs,
  assignVendorToJob
} = require("../controllers/jobController");

const {
  getJobApplicants
} = require("../controllers/jobController");

const { authMiddleware } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleBasedAuth");

// ---------------- JOB ROUTES ----------------

router.post("/create", authMiddleware, authorizeRoles("society"), createJob);

router.get("/", authMiddleware, authorizeRoles("society"), getAllJobs);

router.get("/nearby", authMiddleware, authorizeRoles("vendor"), getNearbyJobs);

router.get("/nearby-debug", authMiddleware, authorizeRoles("vendor"), getNearbyJobsDebug);

router.get("/new-leads", authMiddleware, authorizeRoles("vendor"), getNearbyJobs);

router.get("/:id/applicants", authMiddleware, authorizeRoles("society"),getJobApplicants);

router.patch("/:jobId/assign-vendor", authMiddleware, authorizeRoles("society"),assignVendorToJob);

router.get("/:id", authMiddleware, getJobById);

router.get("/filter", authMiddleware, filterJobsByTypeAndDate);

router.post("/expire-old", expireOldJobs);

router.delete("/delete/:id", authMiddleware, authorizeRoles("society"), deleteJob);


module.exports = router;
