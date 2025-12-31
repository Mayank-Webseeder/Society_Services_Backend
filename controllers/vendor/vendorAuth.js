const Vendor = require("../../models/vendorSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nonVerified = require("../../models/notVerified");
const Subscription = require("../../models/Subscription");
const { sendOTP, generate4DigitOtp } = require("../../thirdPartyAPI/nodeMailerSMTP/smtpforTOTP");
const Services = require("../../models/Services");


const cloudinary = require("./cloudinary");
const { log } = require("console");



// ✅ VENDOR SIGNUP
exports.signupVendor = async (req, res) => {
	try {
		const { name, contactNumber, password } = req.body;

		// Check if the user has verified their contact number
		// const existing = await nonVerified.findOne({ contactNumber }).select("isVerified");
		// if (!existing || !existing.isVerified) {
		// 	return res.status(400).json({ msg: "First please verify the user" });
		// }

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
		await newVendor.save();

		res.status(201).json({
			authToken: token,
			msg: "Vendor registered successfully.",
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({ msg: "Server error", error: err.message });
	}
};

// ✅ VENDOR LOGIN
// exports.loginVendorUsingEmail = async (req, res) => {
// 	try {
// 		const { email, password } = req.body;
// 		const vendor = await Vendor.find({ email });

// 		if (!vendor) return res.status(400).json({ msg: "Invalid credentials" });
// 		if (vendor.isBlacklisted) {
// 			return res.status(403).json({
// 				msg: "Your account has been blacklisted. You cannot log in.",
// 				reason: vendor.blacklistReason || "Violation of platform policies",
// 				support: "Contact support if you believe this was a mistake.",
// 			});
// 		}
// 		if (!vendor.isApproved) {
// 			return res.status(403).json({
// 				msg: "Your account is not approved by admin yet. Please wait for verification.",
// 			});
// 		}
// 		const isMatch = await bcrypt.compare(password, vendor.password);
// 		if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
// 		const token = jwt.sign({ id: vendor._id, role: vendor.role }, process.env.JWT_SECRET);

// 		res.json({
// 			authToken: token,
// 			role: vendor.role,
// 			user: {
// 				isProfileCompleted: vendor.isProfileCompleted,
// 			},
// 		});
// 	} catch (err) {
// 		res.status(500).json({ msg: "Server error", error: err.message });
// 	}
// };


exports.loginVendorUsingContact = async (req, res) => {
		console.log('loginVendorUsingContact called', { path: req.path, method: req.method });
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
		// console.log(token);
		res.json({
			authToken: token,
			role: vendor.role,
			user: {
				isProfileCompleted: vendor.isProfileCompleted,
			},
		});
	} catch (err) {
		console.log(err);
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

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ msg: "Vendor not found" });
    }

    // 📸 Image - upload middleware attaches cloudinary result to req.idProofFile
    if (req.idProofFile && req.idProofFile.url) {
      vendor.idProofFile = req.idProofFile.url;
    }

// 🔢 Convert numbers explicitly. Use null when not provided to avoid storing 0 as accidental default
    const latitude = req.body["location.GeoLocation.latitude"] !== undefined && req.body["location.GeoLocation.latitude"] !== ""
      ? Number(req.body["location.GeoLocation.latitude"])
      : null;

    const longitude = req.body["location.GeoLocation.longitude"] !== undefined && req.body["location.GeoLocation.longitude"] !== ""
      ? Number(req.body["location.GeoLocation.longitude"])
      : null;

    // 🏠 Assign fields
    vendor.name = req.body.name;
    vendor.businessName = req.body.businessName;
    vendor.experience = req.body.experience;
    vendor.contactNumber = req.body.contactNumber;

    // Preserve uploaded file path; only set from body when explicitly provided
    if (req.body.idProofFile) {
      vendor.idProofFile = req.body.idProofFile;
    }

    vendor.address = {
      buildingNumber: req.body["address.buildingNumber"],
      locality: req.body["address.locality"],
      landmark: req.body["address.landmark"],
      city: req.body["address.city"],
      state: req.body["address.state"],
      pincode: req.body["address.pincode"],
    };

    // Only attach GeoLocation if both latitude and longitude are provided
    const newLocation = {};
    if (latitude != null && longitude != null) {
      newLocation.GeoLocation = { latitude, longitude };
    }
    if (req.body["location.formattedAddress"]) {
      newLocation.formattedAddress = req.body["location.formattedAddress"];
    }
    // If location already has some top-level latitude/longitude fields (legacy), preserve them
    if (req.body["location.latitude"] !== undefined && req.body["location.longitude"] !== undefined) {
      newLocation.latitude = Number(req.body["location.latitude"]);
      newLocation.longitude = Number(req.body["location.longitude"]);
    }

    vendor.location = newLocation;

    // Ensure required fields for completed profile are present
    if (!vendor.idProofFile) {
      return res.status(400).json({ success: false, msg: "ID proof file is required to complete profile" });
    }

    vendor.isProfileCompleted = true;

    await vendor.save();

    res.json({
      success: true,
      msg: "Vendor profile completed successfully",
      vendor,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Profile update failed", error: err.message });
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
