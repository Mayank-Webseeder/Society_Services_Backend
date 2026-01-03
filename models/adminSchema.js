const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    profilePicture: { type: String, default: "AWSDefaultAdmin.jpg" },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    department: { type: String, required: true },
    role: {
      type: String,
      default: "admin",
      immutable: true,
    },
    subrole: {
      type: String,
      enum: ["superAdmin", "admin"], //I dont know proper services and features of the application so hard to decides the subroles as Mayank Sir said made for Tow sub level admin one is superAdmin and admin
      default: "admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
