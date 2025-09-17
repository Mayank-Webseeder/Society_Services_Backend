const notVerified = require("../models/notVerified.js");
exports.signUpNotVerified = async (req, res, next) => {
  try {
    const { email } = req.body;

    const existing = await notVerified.findOne({ email });
    if (existing) {
      if (existing.isVerified) {
        return res.status(203).json({
          status: false,
          msg: "Vendor already verified please make singup",
        });
      }
      req.notVerified = true;
    } else {
      const newnotVerified = new notVerified({
        email,
      });
      req.notVerified = false;
      await newnotVerified.save().then(() => {
        console.log("New not verified user created");
        req.notVerified = true;
      });
    }
    next();
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Server error in notVerifiedAuth", error: err.message });
  }
};
