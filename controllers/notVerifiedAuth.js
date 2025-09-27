const notVerified = require("../models/notVerified.js");
const Vendor = require("../models/vendorSchema.js");

exports.signUpNotVerified = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Check if user already signed up
    const vendor = await Vendor.findOne({ email });
    if (vendor) {
      // Vendor already exists
      return res.status(400).json({
        status: false,
        msg: "Vendor already signed up. Please login.",
      });
    }

    // If vendor doesn't exist, check NotVerified collection
    const existing = await notVerified.findOne({ email });
    if (existing) {
      req.notVerified = true; // unverified user exists
    } else {
      // New email: add to NotVerified
      await notVerified.create({ email });
      req.notVerified = true;
    }

    next(); // call next to generate OTP if needed
  } catch (err) {
    res.status(500).json({ msg: "Server error in notVerifiedAuth", error: err.message });
  }
};



