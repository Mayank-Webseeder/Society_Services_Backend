const Vendor = require("../../models/vendorSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nonVerified = require("../../models/notVerified");

const { sendOTP, generate4DigitOtp } = require("../../thirdPartyAPI/nodeMailerSMTP/smtpforTOTP");

// ✅ VENDOR SIGNUP
exports.signupVendor = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		const existing = await nonVerified.findOne({ email }).select("isVerified");
		if (!existing || !existing.isVerified) {
			return res.status(400).json({ msg: "First please verify the user" });
		}

		const existingVendor = await Vendor.findOne({ email });
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

		const hashed = await bcrypt.hash(password, 10);
		const newVendor = new Vendor({
			name,
			email,
			password: hashed,
			isApproved: false, // 🚫 requires admin approval
		});

		const token = jwt.sign({ id: newVendor._id, role: newVendor.role }, process.env.JWT_SECRET);

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
exports.loginVendor = async (req, res) => {
	try {
		const { email, password } = req.body;
		const vendor = await Vendor.findOne({ email });

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
exports.sendValidationOTP = async (req, res) => {
	try {
		const { email } = req.body;
		const generatedOTP = await generate4DigitOtp(email);

		if (req.notVerified) {
			const response = await sendOTP("no Name", generatedOTP, email);
			if (response) {
				const notVerifiedVendor = await nonVerified.findOne({ email });
				if (notVerifiedVendor) {
					notVerifiedVendor.otp = generatedOTP;
					notVerifiedVendor.lastOTPSend = new Date();
					await notVerifiedVendor.save();
				} else {
					await nonVerified.create({ email, otp: generatedOTP });
				}
				return res.json({ status: false, msg: "Not Verified Vendor OTP Sent" });
			} else {
				return res.status(401).json({ status: false, msg: "Email not sent" });
			}
		} else {
			// forgot password
			const updatedVendor = await Vendor.findOneAndUpdate(
				{ email },
				{ $set: { otp: generatedOTP } },
				{ new: true }
			).select("name");

			if (!updatedVendor) {
				return res.status(404).json({ status: false, msg: "Vendor not found" });
			}

			const response = await sendOTP(updatedVendor.name, generatedOTP, email);

			if (response) {
				res.json({
					status: true,
					msg: "OTP sent to your email",
					vendorName: updatedVendor.name,
				});
			} else {
				res.status(500).json({
					status: false,
					msg: "Failed to send OTP, please try again later",
				});
			}
		}
	} catch (err) {
		res.status(503).json({ msg: "Server error", error: err.message });
	}
};

// ✅ VALIDATE EMAIL AFTER OTP
exports.validateEmail = async (req, res) => {
	try {
		const { email } = req.body;

		if (res.otpValidationResult) {
			const vendor = await Vendor.findOne({ email });
			vendor.otp = null;
			vendor.isVerified = true;
			await vendor.save();

			res.json({
				status: true,
				msg: "Email validated successfully",
			});
		} else if (res.nonVerifiedUserValid) {
			res.json({
				status: true,
				email,
				msg: "New Vendor Verified, please proceed with signup.",
			});
		} else {
			return res.status(400).json({ status: false, msg: "Invalid OTP" });
		}
	} catch (error) {
		res.status(500).json({ msg: "Server error", error: error.message });
	}
};

// ✅ CREATE VENDOR PROFILE
exports.createVendorProfile = async (req, res) => {
	try {
		const vendorId = req.user.id;
		const updateData = {};

		if (req.body.name) updateData.name = req.body.name;
		if (req.body.address) updateData.address = req.body.address;
		if (req.body.services) updateData.services = req.body.services;
		if (req.body.workingDays) updateData.workingDays = req.body.workingDays;
		if (req.body.workingHours) updateData.workingHours = req.body.workingHours;
		if (req.body.location) updateData.location = req.body.location;
		if (req.body.paymentMethods) updateData.paymentMethods = req.body.paymentMethods;
		if (req.body.lastPayments) updateData.lastPayments = req.body.lastPayments;
		if (req.body.businessName) updateData.businessName = req.body.businessName;
		if (req.body.experience) updateData.experience = req.body.experience+" years";
		if (req.body.phone) updateData.phone = req.body.phone;

		// ✅ handle idProof only if sent
		if (req.body.uniqueName) {
			updateData.idProof = "uploads/" + req.body.uniqueName;
		}

		updateData.isProfileCompleted = true;

		const updatedVendor = await Vendor.findByIdAndUpdate(vendorId, updateData, {
			new: true,
			runValidators: true,
		});

		if (!updatedVendor) {
			return res.status(404).json({ success: false, message: "Vendor not found" });
		}

		res.status(201).json({
			success: true,
			idProof: updateData.idProof ? updateData.idProof : "No File Sent",
			message: "Vendor profile updated successfully!!",
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
			const { email, newPassword } = req.body;
			const vendor = await Vendor.findOne({ email });

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
