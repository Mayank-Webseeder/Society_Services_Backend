const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
  title: { type: String, required: true },
  message: { type: String },
  link: { type: String }, // Optional - redirect path for in-app notifications
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", NotificationSchema);
