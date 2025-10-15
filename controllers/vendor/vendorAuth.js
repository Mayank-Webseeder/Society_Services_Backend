const Vendor = require("../../models/vendorSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nonVerified = require("../../models/notVerified");
const Subscription = require("../../models/Subscription");
const { sendOTP, generate4DigitOtp } = require("../../thirdPartyAPI/nodeMailerSMTP/smtpforTOTP");

// ✅ VENDOR SIGNUP
exports.signupVendor = async (req, res) => {
	try {
		const { name, contactNumber, password } = req.body;

		// Check if the user has verified their contact number
		const existing = await nonVerified.findOne({ contactNumber }).select("isVerified");
		if (!existing || !existing.isVerified) {
			return res.status(400).json({ msg: "First please verify the user" });
		}

		// Check if a vendor already exists with this contact number
		const existingVendor = await Vendor.findOne({ contactNumber });
		if (existingVendor) {
			if (existingVendor.isBlacklisted) {
				return res.status(403).json({
					msg: "Your registration is blocked. This account has been blacklisted.",
					reasons: [
						"Fraudulent activity or fake credentials",
						"Repeated job cancellations or no-shows",
						"Spamming or abusive behavior on the platform",
						"Violation of platform terms and conditions",
						"Multiple user complaints or poor ratings",
					],
					support: "Contact support if you believe this was a mistake.",
				});
			}
			return res.status(400).json({ msg: "Vendor already registered." });
		}

		// Hash password
		const hashed = await bcrypt.hash(password, 10);

		// Create new vendor
		const newVendor = new Vendor({
			name,
			contactNumber,
			password: hashed,
			isApproved: true, // 🚫 requires admin approval
		});

		// Generate token
		const token = jwt.sign({ id: newVendor._id, role: newVendor.role }, process.env.JWT_SECRET);

		// Save vendor and remove from notVerified
		await newVendor.save();
		await existing.deleteOne();

		res.status(201).json({
			authToken: token,
			msg: "Vendor registered successfully. Awaiting admin approval.",
		});
	} catch (err) {
		res.status(500).json({ msg: "Server error", error: err.message });
	}
};

// ✅ VENDOR LOGIN
exports.loginVendorUsingEmail = async (req, res) => {
	try {
		const { email, password } = req.body;
		const vendor = await Vendor.find({ email });

		if (!vendor) return res.status(400).json({ msg: "Invalid credentials" });
		if (vendor.isBlacklisted) {
			return res.status(403).json({
				msg: "Your account has been blacklisted. You cannot log in.",
				reason: vendor.blacklistReason || "Violation of platform policies",
				support: "Contact support if you believe this was a mistake.",
			});
		}
		if (!vendor.isApproved) {
			return res.status(403).json({
				msg: "Your account is not approved by admin yet. Please wait for verification.",
			});
		}
		const isMatch = await bcrypt.compare(password, vendor.password);
		if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
		const token = jwt.sign({ id: vendor._id, role: vendor.role }, process.env.JWT_SECRET);

		res.json({
			authToken: token,
			role: vendor.role,
			user: {
				isProfileCompleted: vendor.isProfileCompleted,
			},
		});
	} catch (err) {
		res.status(500).json({ msg: "Server error", error: err.message });
	}
};
exports.loginVendorUsingContact = async (req, res) => {
	try {
		const { contactNumber, password } = req.body;
		const vendor = await Vendor.findOne({ contactNumber });

		if (!vendor) return res.status(400).json({ msg: "Invalid credentials" });

		if (vendor.isBlacklisted) {
			return res.status(403).json({
				msg: "Your account has been blacklisted. You cannot log in.",
				reason: vendor.blacklistReason || "Violation of platform policies",
				support: "Contact support if you believe this was a mistake.",
			});
		}

		if (!vendor.isApproved) {
			return res.status(403).json({
				msg: "Your account is not approved by admin yet. Please wait for verification.",
			});
		}

		const isMatch = await bcrypt.compare(password, vendor.password);
		if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

		const token = jwt.sign({ id: vendor._id, role: vendor.role }, process.env.JWT_SECRET);

		res.json({
			authToken: token,
			role: vendor.role,
			user: {
				isProfileCompleted: vendor.isProfileCompleted,
			},
		});
	} catch (err) {
		res.status(500).json({ msg: "Server error", error: err.message });
	}
};

// ✅ SEND OTP

exports.sendSignupOTP = async (req, res) => {
	try {
		const { contactNumber } = req.body;
		if (!contactNumber) {
			return res.status(400).json({ msg: "Contact number is required" });
		}

		// Check if vendor already exists (can't sign up again)
		const vendor = await Vendor.findOne({ contactNumber });
		if (vendor) {
			return res.status(400).json({
				status: false,
				msg: "Contact number already registered. Please log in.",
			});
		}

		// Generate OTP (replace with actual OTP generator)
		const generatedOTP = "1234";

		// Check in notVerified collection
		let notVerifiedVendor = await nonVerified.findOne({ contactNumber });
		if (notVerifiedVendor) {
			notVerifiedVendor.otp = generatedOTP;
			notVerifiedVendor.lastOTPSend = new Date();
			await notVerifiedVendor.save();
		} else {
			notVerifiedVendor = await nonVerified.create({
				contactNumber,
				otp: generatedOTP,
				lastOTPSend: new Date(),
			});
		}

		// TODO: integrate SMS/Email service here
		// await sendOTPToPhone(contactNumber, generatedOTP);

		return res.json({
			status: true,
			msg: "OTP sent to your contact number for signup verification.",
		});
	} catch (err) {
		res.status(500).json({
			msg: "Server error in sendSignupOTP",
			error: err.message,
		});
	}
};

// ✅ VALIDATE EMAIL AFTER OTP
exports.validateContactNumber = async (req, res) => {
	try {
		if (res.nonVerifiedUserValid) {
			return res.json({
				status: true,
				msg: "New Vendor verified, proceed with signup",
			});
		}
		if (res.otpValidationResult) {
			return res.json({
				status: true,
				msg: "Vendor contact number verified successfully",
			});
		}
		res.status(400).json({ status: false, msg: "Invalid OTP" });
	} catch (err) {
		res.status(500).json({ status: false, msg: "Server error", error: err.message });
	}
};

// ✅ CREATE VENDOR PROFILE
exports.createVendorProfile = async (req, res) => {
	try {
		const vendorId = req.user.id;
		const updateData = {};

		// Update fields
		if (req.body.name) updateData.name = req.body.name;
		if (req.body.businessName) updateData.businessName = req.body.businessName;
		if (req.body.experience) updateData.experience = req.body.experience + " years";
		if (req.body.contactNumber) updateData.contactNumber = req.body.contactNumber;
		if (req.body.location) updateData.location = req.body.location;
		if (req.body.address) updateData.address = req.body.address;
		if (req.body.gender) updateData.gender = req.body.gender;
		// if (req.body.paymentMethods) updateData.paymentMethods = req.body.paymentMethods;
		// if (req.body.lastPayments) updateData.lastPayments = req.body.lastPayments;
		if (req.body.services) {
			const vendor = await Vendor.findById(vendorId).select("services");
			updateData.services = Array.from(new Set([...(vendor.services || []), ...req.body.services]));
		}
		if (req.body.email) updateData.email = req.body.email;
		// Working days
		// console.log("Incoming workingDays:", req.body.workingDays, typeof req.body.workingDays);

		

		// idProof
		if (req.idProofFile) {
			updateData.idProof = req.idProofFile.path; // "/uploads/xxxx.png"
		}

		if (req.body.paymentSuccess) {
			updateData.isSubscribed = true; // mark subscription as true
		}

		updateData.isProfileCompleted = true;

		// ✅ First update the vendor
		const updatedVendor = await Vendor.findByIdAndUpdate(vendorId, updateData, {
			new: true,
			runValidators: true,
		});

		if (!updatedVendor) {
			return res.status(404).json({ success: false, message: "Vendor not found" });
		}

		// ✅ Then create subscription if paymentSuccess
		let subscriptionData = null;
		if (req.body.paymentSuccess === true || req.body.paymentSuccess === "true") {
			subscriptionData = await Subscription.create({
				vendor: updatedVendor._id,
				vendorName: updatedVendor.name,
				vendorReferenceId: updatedVendor.vendorReferenceId,
				planPrice: 999,
				startDate: new Date(),
				endDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000), // 360 days
				paymentStatus: "Paid",
				subscriptionStatus: "Active",
				isActive: true,
				services: (req.body.services || []).map((service) => ({
					name: service,
					proratedPrice: 999,
				})),
			});

			// Link subscription to vendor
			updatedVendor.subscription = {
				isActive: true,
				expiresAt: subscriptionData.endDate,
			};
			await updatedVendor.save();
			return res.status(201).json({
				success: true,
				idProof: updateData.idProof || "No File Sent",
				message: "Vendor profile created successfully with subscription!",
				subscription: subscriptionData,
			});
		}

		return res.status(201).json({
			success: true,
			idProof: updateData.idProof || "No File Sent",
			message: "Vendor profile created successfully!",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// ✅ FORGOT PASSWORD
exports.forgetPassword = async (req, res) => {
	try {
		if (res.otpValidationResult) {
			const { contactNumber, newPassword } = req.body;
			const vendor = await Vendor.findOne({ contactNumber });

			vendor.otp = null;
			vendor.password = await bcrypt.hash(newPassword, 10);
			await vendor.save();

			res.json({ msg: "Password reset successful" });
		} else {
			return res.status(400).json({ msg: "Invalid OTP" });
		}
	} catch (err) {
		res.status(500).json({ msg: "Server error", error: err.message });
	}
};
exports.sendForgotPasswordOTP = async (req, res) => {
	try {
		const { contactNumber } = req.body;

		if (!contactNumber) {
			return res.status(400).json({ status: false, msg: "Contact number is required" });
		}

		// Check if vendor exists
		const vendor = await Vendor.findOne({ contactNumber });
		if (!vendor) {
			return res.status(404).json({ status: false, msg: "Vendor not found" });
		}

		// Generate OTP (4 digits)
		// const generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
		const generatedOTP = "1234";

		// Save OTP, reset verification, and update timestamp
		vendor.otp = generatedOTP;
		// vendor.lastOTPSend = new Date();
		vendor.isVerified = false; // will be flipped after OTP validation
		await vendor.save();

		// Send OTP via SMS/Email service here
		// await sendOTPToPhone(contactNumber, generatedOTP);

		return res.json({
			status: true,
			msg: "OTP sent to your registered contact number.",
			vendorName: vendor.name, // optional for frontend
		});
	} catch (err) {
		console.error("Error in sendForgotPasswordOTP:", err);
		res.status(500).json({
			status: false,
			msg: "Server error in sendForgotPasswordOTP",
			error: err.message,
		});
	}
};
