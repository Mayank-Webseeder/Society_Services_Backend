const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  message: {
    type: String,
  },
  applicationType: {
    type: String,
    enum: ["interest", "quotation"], // ✅ updated
    required: true,
  },
  quotedPrice: {
    type: Number,
  },
  estimatedTime: {
    hours: { type: Number },
    minutes: { type: Number },
  },
  additionalNotes: {
    type: String,
  },
  status: {
    type: String,
    enum: ["approval pending", "approved", "rejected"],
    default: "approval pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ Auto-clear fields if applicationType is "interest"
applicationSchema.pre("save", function (next) {
  if (this.applicationType === "interest") {
    this.message = undefined;
    this.quotedPrice = undefined;
    this.estimatedTime = undefined;
    this.additionalNotes = undefined;
  }
  next();
});

module.exports = mongoose.model("Application", applicationSchema);
