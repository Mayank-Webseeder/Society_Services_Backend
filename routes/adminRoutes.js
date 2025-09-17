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

// 🧑‍💼 Admin Auth
router.post("/login", loginAdmin); // ✅ Only login route (signup removed)

// 📜 Subscription Management
router.get(
  "/all-subscriptions",
  authenticate,
  authorizeRoles("admin"),
  getAllSubscriptions
);

router.get(
  "/vendor-subscription-history/:vendorId",
  authenticate,
  authorizeRoles("admin"),
  getVendorSubscriptionHistory
);

router.patch(
  "/cancel-subscription/:subscriptionId",
  authenticate,
  authorizeRoles("admin"),
  cancelSubscription
);

// 🧾 Vendor Management
router.get(
  "/vendors-by-role",
  authenticate,
  authorizeRoles("admin"),
  getVendorsGroupedByRole
);

router.get(
  "/pending-vendors",
  authenticate,
  authorizeRoles("admin"),
  getPendingVendors
);

router.patch(
  "/approve-vendor/:vendorId",
  authenticate,
  authorizeRoles("admin"),
  approveVendor
);

router.patch(
  "/blacklist-vendor/:vendorId",
  authenticate,
  authorizeRoles("admin"),
  blacklistVendor
);

router.get(
  "/blacklisted-vendors",
  authenticate,
  authorizeRoles("admin"),
  getBlacklistedVendors
);

router.get(
  "/all-vendors",
  authenticate,
  authorizeRoles("admin"),
  getAllVendors
);

// 🏢 Society Management
router.patch(
  "/approve-society/:societyId",
  authenticate,
  authorizeRoles("admin"),
  approveSociety
);

router.get(
  "/pending-societies",
  authenticate,
  authorizeRoles("admin"),
  getPendingSocieties
);

router.get(
  "/approved-societies",
  authenticate,
  authorizeRoles("admin"),
  getApprovedSocieties
);

// 📊 Job Stats (Weekly/Monthly/Yearly)
router.get(
  "/jobs/stats",
  authenticate,
  authorizeRoles("admin"),
  getJobStats
);


module.exports = router;
