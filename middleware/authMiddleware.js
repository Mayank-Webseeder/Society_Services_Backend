const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendorSchema");
const Society = require("../models/SocietySchema");

exports.authMiddleware = async (req, res, next) => {
  const token = req.header("auth-token") || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};
