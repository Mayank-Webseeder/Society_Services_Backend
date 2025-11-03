const express = require("express");
const router = express.Router();

const {
	loginVendorUsingContact,
	signupVendor,
	createVendorProfile,
	sendSignupOTP,
	validateContactNumber,
	forgetPassword,
	sendForgotPasswordOTP,
} = require("../controllers/vendor/vendorAuth");

const { purchaseSubscription, checkSubscriptionStatus, addServiceToSubscription, createRazorpayOrder, verifyRazorpayPayment, createAddServiceOrder, verifyAddServicePayment } = require("../controllers/vendor/subscriptionController");


const { validateOTP, validateForgotPasswordOTP } = require("../middleware/thirdPartyServicesMiddleware");
const { authenticate, authorizeRoles } = require("../middleware/roleBasedAuth");

const uploadIDProof = require("../middleware/uploadIDProof");
const uploadProfilePicture = require("../middleware/uploadProfilePicture.js");
const { signUpNotVerified } = require("../controllers/notVerifiedAuth");
const { getMyApplications, getVendorDashboard, getVendorProfile, updateVendorProfile,getFeedbacks,getRating, createSupportRequest } = require("../controllers/vendor/VendorProfile");
const { getAllServices } = require("../controllers/admin/vendorController.js");
const uploadHelpImage = require("../middleware/uploadHelpImage.js");
const { getAllJobs } = require("../controllers/admin/jobStatsController.js");

/**
 * @swagger
 * tags:
 *   name: Vendor
 *   description: Vendor authentication, profile, subscription and application routes
 */

/**
 * @swagger
 * /vendor/signup:
 *   post:
 *     summary: Vendor signup
 *     tags: [Vendor]
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
 *         description: Vendor signed up successfully
 */
router.post("/signup", signupVendor);

/**
 * @swagger
 * /vendor/login:
 *   post:
 *     summary: Vendor login
 *     tags: [Vendor]
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
 *         description: Vendor logged in successfully
 */
router.post("/login", loginVendorUsingContact);

/**
 * @swagger
 * /vendor/createProfile:
 *   put:
 *     summary: Create vendor profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               idProof:
 *                 type: string
 *                 format: binary
 *               companyName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor profile created
 */
router.put("/createProfile", authenticate, authorizeRoles("vendor"), uploadIDProof, createVendorProfile);

/**
 * @swagger
 * /vendor/sendOtpEmailVerification:
 *   post:
 *     summary: Send OTP for email verification
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent
 */
router.post("/sendOtpContactVerification", signUpNotVerified, sendSignupOTP);
router.post("/sendOTP", sendForgotPasswordOTP);

/**
 * @swagger
 * /vendor/validateEmail:
 *   post:
 *     summary: Validate email using OTP
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email validated
 */
router.post("/validateContactNumber", validateOTP, validateContactNumber);

/**
 * @swagger
 * /vendor/forgetPassword:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post("/forgetPassword", validateForgotPasswordOTP, forgetPassword);

/**
 * @swagger
 * /vendor/subscription-status:
 *   get:
 *     summary: Check subscription status
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription status
 */
router.get("/subscription-status", authenticate, authorizeRoles("vendor"), checkSubscriptionStatus);



/**
 * @swagger
 * /vendor/jobs/{id}/apply:
 *   post:
 *     summary: Apply to a job (interest or quotation)
 *     tags: [Vendor]
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
 *         description: Application submitted
 */
// router.post("/jobs/:id/apply", authenticate, authorizeRoles("vendor"), applyToJob);

/**
 * @swagger
 * /vendor/my-applications:
 *   get:
 *     summary: Get all applications by vendor
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vendor applications
 */
router.get("/my-applications", authenticate, authorizeRoles("vendor"), getMyApplications);

/**
 * @swagger
 * /vendor/dashboard:
 *   get:
 *     summary: Vendor dashboard
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor dashboard data
 */
router.get("/dashboard", authenticate, authorizeRoles("vendor"), getVendorDashboard);

/**
 * @swagger
 * /vendor/profile:
 *   get:
 *     summary: View vendor profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor profile data
 */
router.get("/profile", authenticate, authorizeRoles("vendor"), getVendorProfile);

/**
 * @swagger
 * /vendor/profile:
 *   put:
 *     summary: Update vendor profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor profile updated
 */
router.put("/profile", authenticate, authorizeRoles("vendor"), uploadProfilePicture, uploadIDProof, updateVendorProfile);
router.get("/getRating", authenticate, getRating);
router.get("/services", getAllServices);
router.post("/support", authenticate, authorizeRoles("vendor"), uploadHelpImage, createSupportRequest);
router.post("/create-order", authenticate, authorizeRoles("vendor"),createRazorpayOrder);
router.post("/verify-payment", authenticate, authorizeRoles("vendor"), verifyRazorpayPayment);
router.post("/add-service-order", authenticate, authorizeRoles("vendor"),createAddServiceOrder);
router.post("/add-service-verify", authenticate,authorizeRoles("vendor"), verifyAddServicePayment);
// GET vendor's own feedbacks
router.get("/getFeedbacks", authenticate, getFeedbacks);

module.exports = router;
