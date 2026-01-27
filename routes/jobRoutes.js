const express = require("express");
const { getAllJobs } = require("../controllers/jobController");

const router = express.Router();
const {
  createJob,
  getNearbyJobs,
  getJobById,
  getMyPostedJobs,
  filterJobsByTypeAndDate,
  expireOldJobs,
  deleteJob,
  getNearbyJobsDebug
} = require("../controllers/jobController");

const { authMiddleware } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleBasedAuth");


router.post("/create", authMiddleware, authorizeRoles("society"), createJob);

router.get("/", authMiddleware, authorizeRoles("society"), getAllJobs);

router.get("/nearby", authMiddleware, authorizeRoles("vendor"), getNearbyJobs);


router.get("/nearby-debug", authMiddleware, authorizeRoles("vendor"), getNearbyJobsDebug);

router.get("/job/:id", authMiddleware, getJobById);

router.get("/new-leads", authMiddleware, authorizeRoles("vendor"), getNearbyJobs);

router.get("/filter", authMiddleware, filterJobsByTypeAndDate);

router.post("/expire-old", expireOldJobs);

router.delete("/delete/:id", authMiddleware, authorizeRoles("society"),deleteJob)

module.exports = router;























// const express = require("express");
// const router = express.Router();

// const {
//   createJob,
//   getNearbyJobs,
//   getJobById,
//   getMyPostedJobs,
//   filterJobsByTypeAndDate,
//   expireOldJobs
// } = require("../controllers/jobController");

// const { authMiddleware } = require("../middleware/authMiddleware");
// const { authorizeRoles } = require("../middleware/roleBasedAuth");

// /**
//  * @swagger
//  * tags:
//  *   name: Jobs
//  *   description: Job management routes
//  */

// /**
//  * @swagger
//  * /jobs/create:
//  *   post:
//  *     summary: Create a new job
//  *     tags: [Jobs]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               title:
//  *                 type: string
//  *               description:
//  *                 type: string
//  *               type:
//  *                 type: string
//  *               location:
//  *                 type: string
//  *     responses:
//  *       201:
//  *         description: Job created successfully
//  *       400:
//  *         description: Bad request
//  */
// router.post("/create", authMiddleware, authorizeRoles("society"),createJob);

// /**
//  * @swagger
//  * /jobs/nearby:
//  *   get:
//  *     summary: Get jobs near vendor location
//  *     tags: [Jobs]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: List of nearby jobs
//  */
// router.get("/nearby", authMiddleware, authorizeRoles("vendor"),getNearbyJobs);

// /**
//  * @swagger
//  * /jobs/{id}:
//  *   get:
//  *     summary: Get job details by ID
//  *     tags: [Jobs]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - name: id
//  *         in: path
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Job ID
//  *     responses:
//  *       200:
//  *         description: Job details
//  *       404:
//  *         description: Job not found
//  */
// router.get("/:id", authMiddleware, getJobById);


// /**
//  * @swagger
//  * /jobs/filter:
//  *   get:
//  *     summary: Filter jobs by type or date
//  *     tags: [Jobs]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - name: type
//  *         in: query
//  *         schema:
//  *           type: string
//  *       - name: startDate
//  *         in: query
//  *         schema:
//  *           type: string
//  *           format: date
//  *       - name: endDate
//  *         in: query
//  *         schema:
//  *           type: string
//  *           format: date
//  *     responses:
//  *       200:
//  *         description: Filtered jobs list
//  */
// router.get("/filter", authMiddleware, filterJobsByTypeAndDate);

// /**
//  * @swagger
//  * /jobs/expire-old:
//  *   post:
//  *     summary: Expire jobs older than 90 days
//  *     tags: [Jobs]
//  *     responses:
//  *       200:
//  *         description: Expired old jobs
//  */
// router.post("/expire-old", expireOldJobs);

// /**
//  * @swagger
//  * /jobs/test:
//  *   get:
//  *     summary: Health check for jobs route
//  *     tags: [Jobs]
//  *     responses:
//  *       200:
//  *         description: Job route working
//  */
// router.get("/test", (req, res) => {
//   res.send("Job route working");
// });

// module.exports = router;
