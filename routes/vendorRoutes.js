const express = require("express");
const router = express.Router();

const {
  loginVendor,
  signupVendor,
  createVendorProfile,
  sendValidationOTP,
  validateEmail,
  forgetPassword,
} = require("../controllers/vendor/vendorAuth");

const {
  purchaseSubscription,
  checkSubscriptionStatus,
  addServiceToSubscription   // ✅ ✅ Add this line
} = require("../controllers/vendor/subscriptionController");

const {
  applyToJob,
} = require("../controllers/applicationController"); // ✅ NEW

const { validateOTP } = require("../middleware/thirdPartyServicesMiddleware");
const {
  authenticate,
  authorizeRoles,
} = require("../middleware/roleBasedAuth");

const uploadIDProof = require("../middleware/uploadIDProof");
const { signUpNotVerified } = require("../controllers/notVerifiedAuth");
const {
  getMyApplications,
  getVendorDashboard,
  getVendorProfile,
  updateVendorProfile,
} = require("../controllers/vendor/vendorProfile");

// 🔐 Auth & Profile
router.post("/signup", signupVendor);
router.post("/login", loginVendor);

router.put(
  "/createProfile",
  authenticate,
  authorizeRoles("vendor"),
  uploadIDProof,
  createVendorProfile
);

// 📧 OTP & Email Verification
router.post("/sendOtpEmailVerification", signUpNotVerified, sendValidationOTP);
router.post("/sendOTP", sendValidationOTP);
router.post("/validateEmail", validateOTP, validateEmail);
router.post("/forgetPassword", validateOTP, forgetPassword);

// 💳 Subscription
router.post(
  "/subscribe",
  authenticate,
  authorizeRoles("vendor"),
  purchaseSubscription
);

router.get(
  "/subscription-status",
  authenticate,
  authorizeRoles("vendor"),
  checkSubscriptionStatus
);

// 🔄 Add a new service (prorated charge)
router.post(
  "/add-service",
  authenticate,
  authorizeRoles("vendor"),
  addServiceToSubscription
);

// 📩 Vendor applies to job (interest or quotation)
router.post(
  "/jobs/:id/apply",
  authenticate,
  authorizeRoles("vendor"),
  applyToJob
);

router.get(
  "/my-applications",
  authenticate,
  authorizeRoles("vendor"),
  getMyApplications
);

// 🧑 Vendor → Dashboard Access
router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("vendor"),
  getVendorDashboard
);

// 🧑 Vendor → View Profile
router.get(
  "/profile",
  authenticate,
  authorizeRoles("vendor"),
  getVendorProfile
);

// 🧑 Vendor → Update Profile
router.put(
  "/profile",
  authenticate,
  authorizeRoles("vendor"),
  updateVendorProfile
);

module.exports = router;
