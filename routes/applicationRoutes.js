const express = require("express");
const router = express.Router();
const upload=require("../controllers/vendor/multer")
const {
  applyToJob,
  showInterestInJob,
  getJobApplicants,
  approveApplication,
  getVendorApplicationType,
  debugListApplicationsForJob,
  debugListOrphanApplications,
} = require("../controllers/applicationController");

const { authMiddleware } = require("../middleware/authMiddleware");
const uploadQuotedPdf = require("../middleware/uploadQuotedPDF");
const { authorizeRoles } = require("../middleware/roleBasedAuth");


//appty to job without quotation
router.post("/:id/interest", authMiddleware, authorizeRoles("vendor"), showInterestInJob);


//apply to job with quotation
router.post("/:id/apply", authMiddleware, authorizeRoles("vendor"),upload.single("quotedpdf"),uploadQuotedPdf,applyToJob);

router.get("/:id/applicants", authMiddleware, authorizeRoles("society"),getJobApplicants);

// Dev-only debug helpers (only enabled non-production via controller checks)
router.get("/debug/job/:jobId", authMiddleware, debugListApplicationsForJob);
router.get("/debug/orphans", authMiddleware, debugListOrphanApplications);

router.post("/:applicationId/approve", authMiddleware, authorizeRoles("society"),approveApplication);

router.get("/:jobId/vendor/:vendorId", authMiddleware, authorizeRoles("society"),getVendorApplicationType);

module.exports = router;


/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Vendor job applications and society approvals
 */

/**
 * @swagger
 * /applications/{id}/interest:
 *   post:
 *     summary: Vendor shows interest in a job (without quotation)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Interest registered successfully
 *       401:
 *         description: Unauthorized
 */
//router.post("/:id/interest", authMiddleware, authorizeRoles("vendor"), showInterestInJob);

/**
 * @swagger
 * /applications/{id}/apply:
 *   post:
 *     summary: Vendor applies to a job with quotation
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quotation:
 *                 type: number
 *                 example: 5000
 *               message:
 *                 type: string
 *                 example: "I can complete this work in 2 weeks."
 *     responses:
 *       200:
 *         description: Application submitted successfully
 *       401:
 *         description: Unauthorized
 */
//router.post("/:id/apply", authMiddleware, authorizeRoles("vendor"),upload.single("quotedpdf"),uploadQuotedPdf,applyToJob);

/**
 * @swagger
 * /applications/{id}/applicants:
 *   get:
 *     summary: Get all vendor applicants for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: List of applicants
 *       401:
 *         description: Unauthorized
 */
//router.get("/:id/applicants", authMiddleware, authorizeRoles("society"),getJobApplicants);

/**
 * @swagger
 * /applications/{applicationId}/approve:
 *   post:
 *     summary: Approve a vendor's application for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application approved successfully
 *       401:
 *         description: Unauthorized
 */
//router.post("/:applicationId/approve", authMiddleware, authorizeRoles("society"),approveApplication);

/**
 * @swagger
 * /applications/job/{jobId}/complete:
 *   post:
 *     summary: Mark a job as completed
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job marked as completed
 *       401:
 *         description: Unauthorized
 */
// router.post("/job/:jobId/complete", authMiddleware, authorizeRoles("society"),markJobComplete);

/**
 * @swagger
 * /applications/{jobId}/vendor/{vendorId}:
 *   get:
 *     summary: Check what type of application a vendor submitted for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor application type returned
 *       401:
 *         description: Unauthorized
 */
// router.get("/:jobId/vendor/:vendorId", authMiddleware, authorizeRoles("society"),getVendorApplicationType);

// module.exports = router;
