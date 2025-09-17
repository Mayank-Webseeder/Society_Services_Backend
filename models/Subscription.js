const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    vendorReferenceId: {
      type: String,
      required: true,
    },

    planPrice: {
      type: Number,
      default: 999,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    subscriptionStatus: {
      type: String,
      enum: ["Active", "Inactive", "Expired", "Cancelled"],
      default: "Active",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ Services subscribed with individual metadata
    services: [
      {
        name: {
          type: String,
          required: true,
          enum: [
            "Plumber",
            "Electrician",
            "Carpenter",
            "Painter",
            "AC Technician",
            "CCTV Installer",
            // Add more roles here if needed
          ],
        },
        addedOn: {
          type: Date,
          required: true,
          default: Date.now,
        },
        proratedPrice: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
