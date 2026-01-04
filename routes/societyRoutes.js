const express = require("express");
const router = express.Router();

const { signupSociety, loginSociety, giveRating } = require("../controllers/society/societyAuth");

const {
    getMyPostedJobs,
    getJobById,
    getSocietyDetails,
    getActiveSocientyJobs,
} = require("../controllers/jobController");

const { deleteJob } = require("../controllers/admin/jobStatsController");

const {
    getJobApplicants,
    completejob,
    approveApplication,
    getVendorApplicationType,
    rejectApplication,
    getApplicantCount,
} = require("../controllers/applicationController");

const { authenticate, authorizeRoles } = require("../middleware/roleBasedAuth");


router.get("/dashboard", authenticate, authorizeRoles("society"), (req, res) => {
    res.json({ msg: "Welcome to Society Dashboard", user: req.user });
});

router.post("/signup", signupSociety);

router.post("/login", loginSociety);

router.post("/applications/:applicationId/approve", authenticate, authorizeRoles("society"), approveApplication);


router.get("/jobs/:id/applicants", authenticate, authorizeRoles("society"), getJobApplicants);

router.put("/applications/:applicationId/compltetjob", authenticate, authorizeRoles("society"), completejob);

router.post("/give-feedback/:jobId", authenticate, authorizeRoles("society"), giveRating);


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
 *     summary: Register a new society
 *     tags: [Society]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               buildingName:
 *                 type: string
 *               address:
 *                 type: string
 *               residentsCount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Society registered successfully
 */
// router.post("/signup", signupSociety);


/**
 * @swagger
 * /society/login:
 *   post:
 *     summary: Login society
 *     tags: [Society]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
// router.post("/login", loginSociety);


/**
 * @swagger
 * /society/dashboard:
 *   get:
 *     summary: Society dashboard (requires authentication)
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
// router.get("/dashboard", authenticate, authorizeRoles("society"), (req, res) => {
//     res.json({ msg: "Welcome to Society Dashboard", user: req.user });
// });


/**
 * @swagger
 * /society/jobs/posted:
 *   get:
 *     summary: Get jobs posted by the society
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of posted jobs
 */
router.get("/jobs/posted", authenticate, authorizeRoles("society"), getMyPostedJobs);


/**
 * @swagger
 * /society/jobs/{id}:
 *   get:
 *     summary: Get single job by ID
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Job details
 */
router.get("/jobs/:id", authenticate, authorizeRoles("society"), getJobById);


/**
 * @swagger
 * /society/jobs/{id}/applicants:
 *   get:
 *     summary: Get all applicants for a job
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Applicants list
 */
// router.get("/jobs/:id/applicants", authenticate, authorizeRoles("society"), getJobApplicants);

// router.put("/applications/:applicationId/compltetjob", authenticate, authorizeRoles("society"), completejob);


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
 *     responses:
 *       200:
 *         description: Application approved, job marked completed
 */
// router.post("/applications/:applicationId/approve", authenticate, authorizeRoles("society"), approveApplication);


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
 *     responses:
 *       200:
 *         description: Application rejected
 */
router.post("/applications/:applicationId/reject", authenticate, authorizeRoles("society"), rejectApplication);


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
 *     responses:
 *       200:
 *         description: Numbers of applicants
 */
router.get("/jobs/:jobId/applicant-count", authenticate, authorizeRoles("society"), getApplicantCount);


/**
 * @swagger
 * /society/jobs/{jobId}/vendor/{vendorId}:
 *   get:
 *     summary: Get vendor application type (quotation / interest)
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *       - name: vendorId
 *     responses:
 *       200:
 *         description: Vendor application status
 */
router.get("/jobs/:jobId/vendor/:vendorId", authenticate, authorizeRoles("society"), getVendorApplicationType);


/**
 * @swagger
 * /society/jobs/{jobId}/delete:
 *   delete:
 *     summary: Delete job posted by society
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         required: true
 *         in: path
 *     responses:
 *       200:
 *         description: Job deleted successfully
 */
router.delete("/jobs/:jobId/delete", authenticate, authorizeRoles("society"), deleteJob);


/**
 * @swagger
 * /society/give-feedback/{jobId}:
 *   post:
 *     summary: Submit rating & feedback for completed job
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               feedbackText:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating submitted
 */
// router.post("/give-feedback/:jobId", authenticate, authorizeRoles("society"), giveRating);


/**
 * @swagger
 * /society/profile:
 *   get:
 *     summary: Get society profile details + stats
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Society profile fetched
 */
router.get("/profile", authenticate, authorizeRoles("society"), getSocietyDetails);


/**
 * @swagger
 * /society/active-jobs:
 *   get:
 *     summary: Get completed jobs for society
 *     tags: [Society]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active completed jobs list
 */
router.get("/active-jobs", authenticate, authorizeRoles("society"), getActiveSocientyJobs);


module.exports = router;
