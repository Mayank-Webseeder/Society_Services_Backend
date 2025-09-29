const notVerified = require("../models/notVerified.js");
const Vendor = require("../models/vendorSchema.js");

exports.signUpNotVerified = async (req, res, next) => {
  try {
    const { contactNumber } = req.body;

    // Check if vendor already signed up with this number
    const vendor = await Vendor.findOne({ contactNumber });
    if (vendor) {
      return res.status(400).json({
        status: false,
        msg: "Vendor already signed up with this contact number. Please login.",
      });
    }

    // If vendor doesn't exist, check NotVerified collection
    const existing = await notVerified.findOne({ contactNumber });
    if (existing) {
      req.notVerified = true; // unverified user exists
    } else {
      // New number: add to NotVerified
      await notVerified.create({ contactNumber });
      req.notVerified = true;
    }

    next(); // proceed to OTP generation
  } catch (err) {
    res.status(500).json({
      msg: "Server error in notVerifiedAuthByContact",
      error: err.message,
    });
  }
};



