const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
// Get admin credentials from .env
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: "admin-id", // dummy static ID
        role: "admin",
        subrole: "superadmin"
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: "admin",
      subrole: "superadmin"
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
