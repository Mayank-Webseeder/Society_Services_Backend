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
  quotedpdf: {
    type: String,
  },

//   status: {
//     type: String,
//     enum: ["approval pending", "approved", "rejected"],
//     default: "approval pending",
//   },

status: {
  type: String,
  enum: ["approval pending", "pending", "accepted", "rejected"],
  default: "approval pending",
},

  createdAt: {
    type: Date,
    default: Date.now,
  },
  society: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Society",
  required: true,
},

});

// ✅ Auto-clear fields if applicationType is "interest"
applicationSchema.pre("save", function (next) {
  if (this.applicationType === "interest") {
    // this.message = undefined;
    this.quotedpdf = undefined;
  }
  next();
});

applicationSchema.index({ job: 1, vendor: 1 }, { unique: true });
module.exports = mongoose.model("Application", applicationSchema);
