const express = require("express");
const router = express.Router();

const {
  createJob,
  getNearbyJobs,
  getJobById,
  getMyPostedJobs,
  filterJobsByTypeAndDate,
  expireOldJobs // 🔁 NEW: controller to expire jobs older than 90 days
} = require("../controllers/jobController");

const { authMiddleware } = require("../middleware/authMiddleware");

// 🔹 POST: Create Job
router.post("/create", authMiddleware, createJob);

// 🔹 GET: Jobs near vendor
router.get("/nearby", authMiddleware, getNearbyJobs);

// 🔹 GET: View Single Job Details (Society/Vendor)
router.get("/:id", authMiddleware, getJobById);

// 🔹 GET: Get all jobs posted by the society
router.get("/my/posted", authMiddleware, getMyPostedJobs);

// 🔹 Optional: Filter Jobs by type/date (Admin or analytics)
router.get("/filter", authMiddleware, filterJobsByTypeAndDate);

// 🔁 POST: Expire jobs older than 90 days
router.post("/expire-old", expireOldJobs); // No auth — protect this in cron or admin later

// 🔹 Health check
router.get("/test", (req, res) => {
  res.send("Job route working");
});

module.exports = router;
