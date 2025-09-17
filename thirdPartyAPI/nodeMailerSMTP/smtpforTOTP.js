/**
 *
 * Run:
 *
 */
require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
exports.sendOTP = async (vendorName, otp, vendorEmail, htmlpart = null) => {
  // Create a transporter for SMTP
  // vendorEmail = vendorEmail.split("+")[0] + "@" + vendorEmail.split("@")[1];

  const transporter = nodemailer.createTransport({
    service: "hostinger",
    host: "smtp.hostinger.com",
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD, // Use environment variable for password
    },
  });
  const mailOptions = {
    from: {
      name: "Vinayak Sharma",
      address: process.env.SMTP_USER,
    }, // Header From:
    to: [vendorEmail],
    subject: "Velnor Messaging Services (Verification)",
    text: `Hello! ${vendorName}, your OTP is ${otp}. Please use this for Validation. <br/> The OTP is valid for 1 Hour `,
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    console.log("Message ID:", info.messageId);
    var retVal = true;
  } catch (error) {
    console.error("Error sending email/Saving OTP to database:", error);
    var retVal = false;
  }
  return retVal;
};

exports.generate4DigitOtp = (vendorEmail) => {
  const timestamp = Math.floor(Date.now() / (1000 * 30)); // changes every 30 seconds
  const raw = `${vendorEmail}-${process.env.TOTP_GENERATION_SECRET}-${timestamp}`;

  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  // Extract digits and slice the first 4 digits
  const digitsOnly = hash.replace(/\D/g, "");
  if (digitsOnly.length >= 4) {
    return digitsOnly.slice(0, 4);
  }
  // Fallback: convert hash to number and mod it to get 4 digits
  const fallback = parseInt(hash.slice(0, 8), 16) % 10000;
  return fallback.toString().padStart(4, "0");
};
