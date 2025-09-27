const Vendor = require("../models/vendorSchema");
const NotVerified = require("../models/notVerified");
const notVerified = NotVerified; // Fix naming inconsistency
exports.validateOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // First check NotVerified collection
    const notVerifiedUser = await notVerified.findOne({ email });
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
    const vendor = await Vendor.findOne({ email }).select("otp isVerified");
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
