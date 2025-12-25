const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendorSchema");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const vendor = await Vendor.findById(decoded.id).select("-password");
    if (!vendor) {
      return res.status(401).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.isBlacklisted) {
      return res.status(403).json({
        success: false,
        message: "Vendor is blacklisted",
      });
    }

    req.user = {
      _id: vendor._id,
      role: vendor.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: err.message,
    });
  }
};
