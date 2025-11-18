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

const {
	checkSubscriptionStatus,
	createRazorpayOrder,
	verifyRazorpayPayment,
	createAddServiceOrder,
	verifyAddServicePayment,
} = require("../controllers/vendor/subscriptionController");

const { validateOTP, validateForgotPasswordOTP } = require("../middleware/thirdPartyServicesMiddleware");
const { authenticate, authorizeRoles } = require("../middleware/roleBasedAuth");

const uploadIDProof = require("../middleware/uploadIDProof");
const uploadProfilePicture = require("../middleware/uploadProfilePicture");
const { signUpNotVerified } = require("../controllers/notVerifiedAuth");

const {
	getMyApplications,
	getVendorDashboard,
	getVendorProfile,
	updateVendorProfile,
	getFeedbacks,
	getRating,
	createSupportRequest,
} = require("../controllers/vendor/VendorProfile");

const { getAllServices } = require("../controllers/admin/vendorController");
const uploadHelpImage = require("../middleware/uploadHelpImage");

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
 *     summary: Register a new vendor using contact number
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - contactNumber
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor registered successfully
 */
router.post("/signup", signupVendor);

/**
 * @swagger
 * /vendor/login:
 *   post:
 *     summary: Vendor login using contact number
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactNumber
 *               - password
 *             properties:
 *               contactNumber:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", loginVendorUsingContact);

/**
 * @swagger
 * /vendor/sendOtpContactVerification:
 *   post:
 *     summary: Send OTP to contact number for signup verification
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactNumber
 *             properties:
 *               contactNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post("/sendOtpContactVerification", signUpNotVerified, sendSignupOTP);

/**
 * @swagger
 * /vendor/sendOTP:
 *   post:
 *     summary: Send OTP for forgot password
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactNumber
 *             properties:
 *               contactNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post("/sendOTP", sendForgotPasswordOTP);

/**
 * @swagger
 * /vendor/validateContactNumber:
 *   post:
 *     summary: Validate OTP for contact number verification
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactNumber
 *               - otp
 *             properties:
 *               contactNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact number verified
 */
router.post("/validateContactNumber", validateOTP, validateContactNumber);

/**
 * @swagger
 * /vendor/forgetPassword:
 *   post:
 *     summary: Reset vendor password using OTP
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactNumber
 *               - otp
 *               - newPassword
 *             properties:
 *               contactNumber:
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
 * /vendor/createProfile:
 *   put:
 *     summary: Create or complete vendor profile
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
 *               name:
 *                 type: string
 *               businessName:
 *                 type: string
 *               experience:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               location:
 *                 type: object
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *               idProof:
 *                 type: string
 *                 description: base64 encoded image
 *     responses:
 *       201:
 *         description: Vendor profile created successfully
 */
router.put("/createProfile", authenticate, authorizeRoles("vendor"), uploadIDProof, createVendorProfile);

/**
 * @swagger
 * /vendor/my-applications:
 *   get:
 *     summary: Get all applications submitted by vendor
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor applications fetched
 */
router.get("/my-applications", authenticate, authorizeRoles("vendor"), getMyApplications);

/**
 * @swagger
 * /vendor/dashboard:
 *   get:
 *     summary: Get vendor dashboard statistics
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data fetched
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
 *         description: Vendor profile fetched
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
 *     responses:
 *       200:
 *         description: Vendor profile updated
 */
router.put("/profile", authenticate, authorizeRoles("vendor"), uploadProfilePicture, uploadIDProof, updateVendorProfile);

/**
 * @swagger
 * /vendor/getRating:
 *   get:
 *     summary: Get vendor rating details
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor rating returned
 */
router.get("/getRating", authenticate, getRating);

/**
 * @swagger
 * /vendor/getFeedbacks:
 *   get:
 *     summary: Get all feedback received by vendor
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feedback fetched
 */
router.get("/getFeedbacks", authenticate, getFeedbacks);

/**
 * @swagger
 * /vendor/support:
 *   post:
 *     summary: Create a support request
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               helpImage:
 *                 type: string
 *                 description: base64 encoded image
 *     responses:
 *       201:
 *         description: Support request created
 */
router.post("/support", authenticate, authorizeRoles("vendor"), uploadHelpImage, createSupportRequest);

/**
 * @swagger
 * /vendor/services:
 *   get:
 *     summary: Get list of all active services
 *     tags: [Vendor]
 *     responses:
 *       200:
 *         description: List of services
 */
router.get("/services", getAllServices);

/**
 * @swagger
 * /vendor/create-order:
 *   post:
 *     summary: Create Razorpay order for subscription
 *     tags: [Vendor Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Razorpay order created
 */
router.post("/create-order", authenticate, authorizeRoles("vendor"), createRazorpayOrder);

/**
 * @swagger
 * /vendor/verify-payment:
 *   post:
 *     summary: Verify Razorpay payment to activate subscription
 *     tags: [Vendor Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Subscription activated
 */
router.post("/verify-payment", authenticate, authorizeRoles("vendor"), verifyRazorpayPayment);

/**
 * @swagger
 * /vendor/add-service-order:
 *   post:
 *     summary: Create Razorpay order for adding services
 *     tags: [Vendor Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newServices:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Add service order created
 */
router.post("/add-service-order", authenticate, authorizeRoles("vendor"), createAddServiceOrder);

/**
 * @swagger
 * /vendor/add-service-verify:
 *   post:
 *     summary: Verify payment and add new services to subscription
 *     tags: [Vendor Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Services added successfully
 */
router.post("/add-service-verify", authenticate, authorizeRoles("vendor"), verifyAddServicePayment);

/**
 * @swagger
 * /vendor/subscription-status:
 *   get:
 *     summary: Get vendor subscription status
 *     tags: [Vendor Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status returned
 */
router.get("/subscription-status", authenticate, authorizeRoles("vendor"), checkSubscriptionStatus);

module.exports = router;
