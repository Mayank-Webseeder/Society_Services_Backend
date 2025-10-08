const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  society: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  feedbackText: { type: String, trim: true, default: "" },
}, { timestamps: true });

// Prevent duplicate rating per job per society
feedbackSchema.index({ job: 1, society: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
