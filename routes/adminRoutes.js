const express = require("express");
const router = express.Router();

const { loginAdmin } = require("../controllers/admin/adminAuth");
const { getJobStats } = require("../controllers/admin/jobStatsController");

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
} = require("../controllers/admin/vendorController");

const {
  approveSociety,
  getPendingSocieties,
  getApprovedSocieties,
} = require("../controllers/admin/societyController");

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

module.exports = router;
