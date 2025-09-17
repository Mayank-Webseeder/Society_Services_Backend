const mongoose = require("mongoose");

const notVerified = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    otp: { type: String, default: null },
    lastOTPSend: { type: Date, default: undefined },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotVerified", notVerified);
