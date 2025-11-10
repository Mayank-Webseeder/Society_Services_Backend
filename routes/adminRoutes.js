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
const { getDashboardStats, getTopVendors } = require("../controllers/admin/dashboard");
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
 *     description: Retrieves the complete subscription history for a specific vendor.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the vendor
 *     responses:
 *       200:
 *         description: Subscription history fetched successfully.
 */
router.get("/vendor-subscription-history/:vendorId", authenticate, authorizeRoles("admin"), getVendorSubscriptionHistory);

/**
 * @swagger
 * /admin/cancel-subscription/{subscriptionId}:
 *   patch:
 *     summary: Cancel a subscription
 *     description: Cancels an ongoing subscription by ID.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the subscription to cancel
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully.
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
 *     description: Marks a vendor as blacklisted.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID to blacklist
 *     responses:
 *       200:
 *         description: Vendor blacklisted successfully.
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
 *     description: Approves a society registration request.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: societyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Society ID to approve
 *     responses:
 *       200:
 *         description: Society approved successfully.
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

/**
 * @swagger
 * /admin/support-requests:
 *   get:
 *     summary: Get all support requests
 *     description: Retrieves all support tickets submitted by vendors or societies.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Support requests retrieved successfully.
 */
router.get("/support-requests", authenticate, authorizeRoles("admin"), getAllSupportRequests);

/**
 * @swagger
 * /admin/support-requests/{id}/status:
 *   patch:
 *     summary: Update support request status
 *     description: Updates the status of a support request (e.g., open, in-progress, resolved).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Support request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 description: New status of the support request
 *     responses:
 *       200:
 *         description: Support status updated successfully.
 */
router.patch("/support-requests/:id/status", authenticate, authorizeRoles("admin"), updateSupportStatus);

/**
 * @swagger
 * /admin/society-directory:
 *   get:
 *     summary: Get all societies with job stats
 *     description: Returns all societies along with related job statistics.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Societies with job stats retrieved successfully.
 */
router.get("/society-directory", authenticate, authorizeRoles("admin"), getAllSocietiesWithJobStats);

/**
 * @swagger
 * /admin/society-directory/{societyId}:
 *   get:
 *     summary: Get society details by ID
 *     description: Retrieves full details of a society by ID.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: societyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Society ID
 *     responses:
 *       200:
 *         description: Society details retrieved successfully.
 */
router.get("/society-directory/:societyId", authenticate, authorizeRoles("admin"), getSocietyDetailsById);

/**
 * @swagger
 * /admin/society-directory/{societyId}/all-jobs:
 *   get:
 *     summary: Get all jobs posted by a society
 *     description: Fetches all jobs associated with a given society.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: societyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Society ID
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully.
 */
router.get("/society-directory/:societyId/all-jobs", authenticate, authorizeRoles("admin"), getAllJobsBySocietyId);

/**
 * @swagger
 * /admin/add-service:
 *   post:
 *     summary: Add a new service
 *     description: Adds a new service available to vendors or societies.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceName:
 *                 type: string
 *                 description: Name of the service
 *               category:
 *                 type: string
 *                 description: Service category
 *     responses:
 *       201:
 *         description: Service added successfully.
 */
router.post("/add-service", authenticate, authorizeRoles("admin"), addServices);

/**
 * @swagger
 * /admin/delete-service:
 *   delete:
 *     summary: Delete a service
 *     description: Deletes a service by ID or name.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID of the service to delete
 *     responses:
 *       200:
 *         description: Service deleted successfully.
 */
router.delete("/delete-service", authenticate, authorizeRoles("admin"), deleteServices);

/**
 * @swagger
 * /admin/services:
 *   get:
 *     summary: Get all services
 *     description: Retrieves all available services.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Services retrieved successfully.
 */
router.get("/services", getAllServices);

/**
 * @swagger
 * /admin/all-vendors-profiles:
 *   get:
 *     summary: Get all vendor profiles
 *     description: Retrieves profile information for all vendors.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor profiles retrieved successfully.
 */
router.get("/all-vendors-profiles", authenticate, authorizeRoles("admin"), getAllVendorsProfile);

/**
 * @swagger
 * /admin/vendors-profiles/{id}:
 *   get:
 *     summary: Get specific vendor profile
 *     description: Retrieves profile information for a single vendor by ID.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor profile retrieved successfully.
 */
router.get("/vendors-profiles/:id", authenticate, authorizeRoles("admin"), getVendorsProfile);

/**
 * @swagger
 * /admin/all-jobs:
 *   get:
 *     summary: Get all jobs
 *     description: Retrieves all jobs created by societies.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully.
 */
router.get("/all-jobs", authenticate, authorizeRoles("admin"), getAllJobs);

/**
 * @swagger
 * /admin/job/{id}:
 *   get:
 *     summary: Get job by ID
 *     description: Fetches job details using job ID.
 *     tags: [Admin]
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
 *         description: Job retrieved successfully.
 */
router.get("/job/:id", authenticate, authorizeRoles("admin"), getJobbyId);

/**
 * @swagger
 * /admin/delete-job/{jobId}:
 *   delete:
 *     summary: Delete a job
 *     description: Deletes a specific job using its ID.
 *     tags: [Admin]
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
 *         description: Job deleted successfully.
 */
router.delete("/delete-job/:jobId", authenticate, authorizeRoles("admin"), deleteJob);


/**
 * @swagger
 * /admin/dashboard-stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieves key metrics and statistics for the admin dashboard.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully.
 */
router.get("/dashboard-stats", authenticate, authorizeRoles("admin"), getDashboardStats);


/**
 * @swagger
 * /admin/top-vendors:
 *   get:
 *     summary: Get top vendors
 *     description: Returns a ranked list of top-performing vendors based on metrics.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top vendors retrieved successfully.
 */
router.get("/top-vendors", authenticate, authorizeRoles("admin"), getTopVendors);
module.exports = router;
