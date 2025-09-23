const express = require("express");
const router = express.Router();

const {
  createJob,
  getNearbyJobs,
  getJobById,
  getMyPostedJobs,
  filterJobsByTypeAndDate,
  expireOldJobs
} = require("../controllers/jobController");

const { authMiddleware } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job management routes
 */

/**
 * @swagger
 * /jobs/create:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Bad request
 */
router.post("/create", authMiddleware, createJob);

/**
 * @swagger
 * /jobs/nearby:
 *   get:
 *     summary: Get jobs near vendor location
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of nearby jobs
 */
router.get("/nearby", authMiddleware, getNearbyJobs);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get job details by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get("/:id", authMiddleware, getJobById);

/**
 * @swagger
 * /jobs/my/posted:
 *   get:
 *     summary: Get all jobs posted by the authenticated society
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get("/my/posted", authMiddleware, getMyPostedJobs);

/**
 * @swagger
 * /jobs/filter:
 *   get:
 *     summary: Filter jobs by type or date
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Filtered jobs list
 */
router.get("/filter", authMiddleware, filterJobsByTypeAndDate);

/**
 * @swagger
 * /jobs/expire-old:
 *   post:
 *     summary: Expire jobs older than 90 days
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Expired old jobs
 */
router.post("/expire-old", expireOldJobs);

/**
 * @swagger
 * /jobs/test:
 *   get:
 *     summary: Health check for jobs route
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Job route working
 */
router.get("/test", (req, res) => {
  res.send("Job route working");
});

module.exports = router;
