const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  society: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Society",
    required: true,
  },

  title: {
    type: String,
    required: true,
    trim: true,
  },

  type: {
    type: String,
    required: true,
  },

  requiredExperience: {
    type: Number,
    required: true,
    min: 0,
  },

  details: {
    type: String,
    required: true,
  },

  contactNumber: {
    type: String,
    required: true,
  },

  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    googleMapLink: { type: String },
  },

  geo: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },

  offeredPrice: {
    type: Number,
    required: true,
  },

  scheduledFor: {
    type: Date,
    required: true,
  },

  quotationRequired: {
    type: Boolean,
    default: false,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  status: {
    type: String,
    enum: ["New", "In Progress", "Completed", "Expired"],
    default: "New",
  },

  completedAt: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  selectedVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    default: null,
  },
});

// 🔍 Geo index for nearby search
jobSchema.index({ geo: "2dsphere" });

// 🪝 Auto set completedAt when job is completed
jobSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "Completed") {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Job", jobSchema);
