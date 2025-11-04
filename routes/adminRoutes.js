const express = require("express");
const router = express.Router();

const { loginAdmin } = require("../controllers/admin/adminAuth");
const { getJobStats, getAllJobs, getJobbyId, deleteJob } = require("../controllers/admin/jobStatsController");

const {
  getAllSubscriptions,
  getVendorSubscriptionHistory,
  cancelSubscription,
} = require("../controllers/admin/subscriptionController");

const { authenticate, authorizeRoles } = require("../middleware/roleBasedAuth");

const {
  getVendorsGroupedByRole,
  getPendingVendors,
  approveVendor,
  blacklistVendor,
  getBlacklistedVendors,
  getAllVendors,
  getAllServices,
  getAllVendorsProfile,
  getVendorsProfile,
} = require("../controllers/admin/vendorController");

const {
  approveSociety,
  getPendingSocieties,
  getApprovedSocieties,
  getSocietyDetailsById,
  getAllJobsBySocietyId,
  getAllSocietiesWithJobStats,
} = require("../controllers/admin/societyController");
const { getAllSupportRequests, updateSupportStatus } = require("../controllers/admin/SupportStatusController");
const { addServices, deleteServices } = require("../controllers/admin/ServicesHandle");
// const { getSocietyDetails } = require("../controllers/jobController");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management and operations
 */

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@test.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginAdmin);

/**
 * @swagger
 * /admin/all-subscriptions:
 *   get:
 *     summary: Get all subscriptions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscriptions
 */
router.get("/all-subscriptions", authenticate, authorizeRoles("admin"), getAllSubscriptions);

/**
 * @swagger
 * /admin/vendor-subscription-history/{vendorId}:
 *   get:
 *     summary: Get subscription history of a vendor
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription history fetched
 */
router.get("/vendor-subscription-history/:vendorId", authenticate, authorizeRoles("admin"), getVendorSubscriptionHistory);

/**
 * @swagger
 * /admin/cancel-subscription/{subscriptionId}:
 *   patch:
 *     summary: Cancel a subscription
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription cancelled
 */
router.patch("/cancel-subscription/:subscriptionId", authenticate, authorizeRoles("admin"), cancelSubscription);

/**
 * @swagger
 * /admin/vendors-by-role:
 *   get:
 *     summary: Get vendors grouped by role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendors grouped by role
 */
router.get("/vendors-by-role", authenticate, authorizeRoles("admin"), getVendorsGroupedByRole);

/**
 * @swagger
 * /admin/pending-vendors:
 *   get:
 *     summary: Get list of pending vendor approvals
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending vendors list
 */
router.get("/pending-vendors", authenticate, authorizeRoles("admin"), getPendingVendors);

/**
 * @swagger
 * /admin/approve-vendor/{vendorId}:
 *   patch:
 *     summary: Approve a vendor
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor approved
 */
router.patch("/approve-vendor/:vendorId", authenticate, authorizeRoles("admin"), approveVendor);

/**
 * @swagger
 * /admin/blacklist-vendor/{vendorId}:
 *   patch:
 *     summary: Blacklist a vendor
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor blacklisted
 */
router.patch("/blacklist-vendor/:vendorId", authenticate, authorizeRoles("admin"), blacklistVendor);

/**
 * @swagger
 * /admin/blacklisted-vendors:
 *   get:
 *     summary: Get all blacklisted vendors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blacklisted vendors list
 */
router.get("/blacklisted-vendors", authenticate, authorizeRoles("admin"), getBlacklistedVendors);

/**
 * @swagger
 * /admin/all-vendors:
 *   get:
 *     summary: Get all vendors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All vendors list
 */
router.get("/all-vendors", authenticate, authorizeRoles("admin"), getAllVendors);

/**
 * @swagger
 * /admin/approve-society/{societyId}:
 *   patch:
 *     summary: Approve a society
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: societyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Society approved
 */
router.patch("/approve-society/:societyId", authenticate, authorizeRoles("admin"), approveSociety);

/**
 * @swagger
 * /admin/pending-societies:
 *   get:
 *     summary: Get pending societies
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending societies list
 */
router.get("/pending-societies", authenticate, authorizeRoles("admin"), getPendingSocieties);

/**
 * @swagger
 * /admin/approved-societies:
 *   get:
 *     summary: Get approved societies
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approved societies list
 */
router.get("/approved-societies", authenticate, authorizeRoles("admin"), getApprovedSocieties);

/**
 * @swagger
 * /admin/jobs/stats:
 *   get:
 *     summary: Get job statistics (weekly/monthly/yearly)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job statistics retrieved
 */
router.get("/jobs/stats", authenticate, authorizeRoles("admin"), getJobStats);
router.get("/support-requests", authenticate, authorizeRoles("admin"), getAllSupportRequests);
router.patch("/support-requests/:id/status", authenticate, authorizeRoles("admin"), updateSupportStatus);
router.get("/society-directory", authenticate, authorizeRoles("admin"), getAllSocietiesWithJobStats);
router.get("/society-directory/:societyId", authenticate, authorizeRoles("admin"), getSocietyDetailsById);
router.get("/society-directory/:societyId/all-jobs", authenticate, authorizeRoles("admin"), getAllJobsBySocietyId);
router.post("/add-service", authenticate, authorizeRoles("admin"), addServices);
router.delete("/delete-service", authenticate, authorizeRoles("admin"), deleteServices);
router.get("/services", getAllServices);
router.get("/all-vendors-profiles", authenticate, authorizeRoles("admin"), getAllVendorsProfile);
router.get("/vendors-profiles/:id", authenticate, authorizeRoles("admin"), getVendorsProfile);
router.get("/all-jobs", authenticate, authorizeRoles("admin"), getAllJobs);
router.get("/job/:id", authenticate, authorizeRoles("admin"), getJobbyId);
router.delete("/delete-job/:jobId",authenticate, authorizeRoles("admin"), deleteJob);
module.exports = router;
