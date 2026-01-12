const mongoose = require("mongoose");

const vendorServiceSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceCategory",
      },
    ],
    experience: {
      type: String, // e.g. "0-1", "1-3", "3-5"
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ek vendor ek service sirf ek baar add kare
vendorServiceSchema.index({ vendor: 1, service: 1 }, { unique: true });

module.exports = mongoose.model("VendorService", vendorServiceSchema);
