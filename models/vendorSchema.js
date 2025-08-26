const mongoose = require("mongoose");
const predefinedRoles = require("../constants/vendorRoles"); // 🔥 NEW

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    businessName: { type: String, default: "Not Given" },
    profilePicture: { type: String, required: false, default: "null" },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String, required: true },
    otp: { type: String },
    isProfileCompleted: { type: Boolean, default: false },

    address: {
      buildingNumber: { type: String, default: "Not Given" },
      locality: { type: String, default: "Not Given" },
      landmark: { type: String, default: "Not Given" },
      city: { type: String, default: "Not Given" },
      state: { type: String, default: "Not Given" },
      pincode: { type: String, default: "000000" },
    },

    idProof: {
      type: String,
      required: false,
      default: "null",
    },

    workingDays: {
      monday: { type: Boolean, default: false },
      tuesday: { type: Boolean, default: false },
      wednesday: { type: Boolean, default: false },
      thursday: { type: Boolean, default: false },
      friday: { type: Boolean, default: false },
      saturday: { type: Boolean, default: false },
      sunday: { type: Boolean, default: false },
    },

    workingHours: {
      from: { type: String, default: "09:00" },
      upto: { type: String, default: "18:00" },
    },

    experience: {
      type: Number,
      default: 0,
    },

    phone: { type: String, default: "Not Given" },

    // 🔧 Restricting services to predefined roles
    services: [
      {
        type: String,
        enum: predefinedRoles,
        required: true,
      }
    ],

    location: {
      GeoLocation: {
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 },
      },
      formattedAddress: {
        type: String,
        default: "Not Given",
      },
    },

    paymentMethods: {
      UPI: {
        uPIID: { type: String, default: "Not Given" },
        uPIApp: { type: String, default: "Not Given" },
      },
      Card: {
        cardType: {
          type: String,
          enum: ["Credit", "Debit"],
          default: "Credit",
        },
        cardNumber: { type: String, default: "Not Given" },
        cardHolderName: { type: String, default: "Not Given" },
        cardExpiry: { type: Date, default: null },
        cardCVV: { type: String, default: "Not Given" },
      },
    },

    lastPayments: [
      {
        paymentDate: { type: Date, default: Date.now },
        amount: { type: Number, default: 0 },
        paymentMethod: {
          type: String,
          enum: ["UPI", "Credit", "Debit"],
          default: "UPI",
        },
        transactionId: { type: String, default: "Not Given" },
        paymentReason: {
          type: String,
          default: "Payment for Velre Subscription",
        },
        paymentStatus: {
          type: String,
          enum: ["Success", "Failed", "Pending"],
          default: "Success",
        },
      },
    ],

    role: {
      type: String,
      default: "vendor",
      immutable: true,
    },

    jobHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],

    subscription: {
      isActive: { type: Boolean, default: false },
      expiresAt: { type: Date },
    },

    vendorReferenceId: {
      type: String,
      required: true,
      unique: true,
      default: () => `VELRE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
},
isApproved: {
  type: Boolean,
  default: false, // Needs admin approval
},
isBlacklisted: {
  type: Boolean,
  default: false,
},
blacklistReason: {
  type: String,
},


  },
  { timestamps: true }
);

module.exports = mongoose.model("Vendor", vendorSchema);
