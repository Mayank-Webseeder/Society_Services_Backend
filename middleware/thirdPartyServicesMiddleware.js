const Vendor = require("../models/vendorSchema");
const nonVerified = require("../models/notVerified");
exports.validateOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const vendor = await Vendor.findOne({ email }).select("otp");
    if (!vendor) {
      var nonVerifiedVendor = await nonVerified
        .findOne({ email })
        .select("otp lastOTPSend isVerified");
      res.nonVerifiedUserValid = false;
      if (!nonVerifiedVendor) {
        return res.status(400).json({ msg: "Vendor not found" });
      } else if (nonVerifiedVendor.isVerified) {
        return res
          .status(204)
          .json({ success: true, msg: "Already Verified Please make signup" });
      }

      const lastOtpSendTimeInMiliSeconds =
        nonVerifiedVendor.lastOTPSend.getTime();
      if (lastOtpSendTimeInMiliSeconds + 60 * 60 * 1000 > Date.now()) {
        console.log(nonVerifiedVendor);
        if (nonVerifiedVendor.otp != otp) {
          // res.nonVerifiedUserValid = false;
          return res.status(400).json({ msg: "Invalid OTP" });
        }

        res.nonVerifiedUserValid = true;
        nonVerifiedVendor.isVerified = true;
        nonVerifiedVendor.otp = null;
        await nonVerifiedVendor.save();

        next();
      }
      // res.nonVerifiedUserValid = false;

      return res.status(400).json({
        sucess: false,
        msg: "OTP is valid for 1 hour, please try again later",
      });
    } else {
      if (vendor.otp != otp) {
        res.otpValidationResult = false;
      } else {
        res.otpValidationResult = true;
      }
    }

    next();
  } catch (err) {
    res.otpValidationResult = false;
    res.validationError = err;
  }
};
