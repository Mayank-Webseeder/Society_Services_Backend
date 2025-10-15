const express = require("express");
const router = express.Router();

const { signupSociety, loginSociety,giveRating } = require("../controllers/society/societyAuth");

const { getMyPostedJobs, getJobById, deleteJob } = require("../controllers/jobController");

const {
	getJobApplicants,
	approveApplication,
	getVendorApplicationType,
	rejectApplication,
	getApplicantCount,
} = require("../controllers/applicationController");

const { authenticate, authorizeRoles } = require("../middleware/roleBasedAuth");

/**
 * @swagger
 * tags:
 *   name: Society
 *   description: Society-related routes
 */

/**
 * @swagger
 * /society/signup:
 *   post:
 *     summary: Society signup
 *     tags: [Society]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Society created successfully
 */
router.post("/signup", signupSociety);

/**
 * @swagger
 * /society/login:
 *   post:
 *     summary: Society login
 *     tags: [Society]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Society logged in successfully
 */
router.post("/login", loginSociety);

/**
 * @swagger
 * /society/dashboard:
 *   get:
 *     summary: Society dashboard (protected)
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Welcome message with user details
 */
router.get("/dashboard", authenticate, authorizeRoles("society"), (req, res) => {
	res.json({ msg: "Welcome to Society Dashboard", user: req.user });
});

/**
 * @swagger
 * /society/jobs/posted:
 *   get:
 *     summary: View jobs posted by society
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get("/jobs/posted", authenticate, authorizeRoles("society"), getMyPostedJobs);

/**
 * @swagger
 * /society/jobs/{id}:
 *   get:
 *     summary: View one job by ID
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 */
router.get("/jobs/:id", authenticate, authorizeRoles("society"), getJobById);

/**
 * @swagger
 * /society/jobs/{jobId}/applicants:
 *   get:
 *     summary: View applicants for a job
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of applicants
 */
router.get("/jobs/:id/applicants", authenticate, authorizeRoles("society"), getJobApplicants);

/**
 * @swagger
 * /society/applications/{applicationId}/approve:
 *   post:
 *     summary: Approve vendor application
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: applicationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application approved
 */
router.post("/applications/:applicationId/approve", authenticate, authorizeRoles("society"), approveApplication);

/**
 * @swagger
 * /society/applications/{applicationId}/reject:
 *   post:
 *     summary: Reject vendor application
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: applicationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application rejected
 */
router.post("/applications/:applicationId/reject", authenticate, authorizeRoles("society"), rejectApplication);

/**
 * @swagger
 * /society/jobs/{jobId}/complete:
 *   post:
 *     summary: Mark job as completed
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job marked completed
 */
// router.post("/jobs/:jobId/complete", authenticate, authorizeRoles("society"), markJobComplete);

/**
 * @swagger
 * /society/jobs/{jobId}/applicant-count:
 *   get:
 *     summary: Get applicant count for a job
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Number of applicants
 */
router.get("/jobs/:jobId/applicant-count", authenticate, authorizeRoles("society"), getApplicantCount);

/**
 * @swagger
 * /society/jobs/{jobId}/vendor/{vendorId}:
 *   get:
 *     summary: View if a specific vendor applied or showed interest
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: vendorId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor application type/status
 */
router.get("/jobs/:jobId/vendor/:vendorId", authenticate, authorizeRoles("society"), getVendorApplicationType);

/**
 * @swagger
 * /society/jobs/{jobId}/delete:
 *   delete:
 *     summary: Delete a job
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted
 */
router.delete("/jobs/:jobId/delete", authenticate, authorizeRoles("society"), deleteJob);

router.post("/give-feedback/:jobId", authenticate, authorizeRoles("society"),giveRating);
module.exports = router;
