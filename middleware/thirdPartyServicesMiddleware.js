const Vendor = require("../models/vendorSchema");
const NotVerified = require("../models/notVerified");
const notVerified = NotVerified; // Fix naming inconsistency
exports.validateOTP = async (req, res, next) => {
	try {
		const { contactNumber, otp } = req.body;
		if (!contactNumber || !otp) {
			return res.status(400).json({ status: false, msg: "Contact number and OTP are required" });
		}
		// First check NotVerified collection
		const notVerifiedUser = await notVerified.findOne({ contactNumber });
		if (notVerifiedUser) {
			if (notVerifiedUser.isVerified) {
				return res.status(200).json({ status: true, msg: "Already verified, proceed to signup" });
			}

			const otpAge = Date.now() - notVerifiedUser.lastOTPSend.getTime();
			if (otpAge > 60 * 60 * 1000) {
				return res.status(400).json({ status: false, msg: "OTP expired, request new one" });
			}

			if (notVerifiedUser.otp !== otp) {
				return res.status(400).json({ status: false, msg: "Invalid OTP" });
			}

			// OTP is correct
			notVerifiedUser.isVerified = true;
			notVerifiedUser.otp = null;
			await notVerifiedUser.save();

			res.nonVerifiedUserValid = true;
			return next();
		}

		// If not in NotVerified, check Vendor
		const vendor = await Vendor.findOne({ contactNumber }).select("otp isVerified");
		if (!vendor) return res.status(404).json({ status: false, msg: "Vendor not found" });

		if (vendor.otp !== otp) {
			return res.status(400).json({ status: false, msg: "Invalid OTP" });
		}

		vendor.isVerified = true;
		vendor.otp = null;
		await vendor.save();

		res.otpValidationResult = true;
		next();
	} catch (err) {
		res.status(500).json({ status: false, msg: "Server error", error: err.message });
	}
};
exports.validateForgotPasswordOTP = async (req, res, next) => {
  try {
    const { contactNumber, otp } = req.body;

    if (!contactNumber || !otp) {
      return res
        .status(400)
        .json({ status: false, msg: "Contact number and OTP are required" });
    }

    // Check vendor (only Vendors are allowed in forgot password)
    const vendor = await Vendor.findOne({ contactNumber });
    if (!vendor) {
      return res
        .status(404)
        .json({ status: false, msg: "Vendor not found in database" });
    }

    // Check OTP age (1 hour validity)
    // const otpAge = Date.now() - new Date(vendor.lastOTPSend).getTime();
    // if (otpAge > 60 * 60 * 1000) {
    //   return res
    //     .status(400)
    //     .json({ status: false, msg: "OTP expired, request new one" });
    // }

    // Check OTP value
    if (vendor.otp !== otp) {
      return res
        .status(400)
        .json({ status: false, msg: "Invalid OTP" });
    }

    // OTP is correct → clear it and continue
    vendor.otp = null;
    await vendor.save();

    res.otpValidationResult = true; // flag for next middleware (e.g. reset password)
    return next();

  } catch (err) {
    res.status(500).json({
      status: false,
      msg: "Server error in validateForgotPasswordOTP",
      error: err.message,
    });
  }
};
