const Vendor = require("../../models/vendorSchema");
const Application = require("../../models/Application");
const Job = require("../../models/Job");


exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ vendor: req.user.id }).populate("job");
    res.json(applications);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
exports.getVendorDashboard = async (req, res) => {
  try {
    const totalApplications = await Application.countDocuments({ vendor: req.user.id });
    const approvedApplications = await Application.countDocuments({
      vendor: req.user.id,
      status: "approved",
    });
    const ongoingJobs = await Job.countDocuments({
      "applications.vendor": req.user.id,
      status: "Ongoing",
    });

    res.json({
      msg: "Vendor Dashboard Data",
      stats: {
        totalApplications,
        approvedApplications,
        ongoingJobs,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch dashboard", error: err.message });
  }
};

// ✅ Vendor → View Profile
exports.getVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id).select("-password");
    if (!vendor) return res.status(404).json({ msg: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch profile", error: err.message });
  }
};

// ✅ Vendor → Update Profile
exports.updateVendorProfile = async (req, res) => {
  try {
    // ✅ Allowed fields for update (whitelist)
    const allowedFields = [
      "name",
      "businessName",
      "profilePicture",
      "contactNumber",
      "experience",
      "services",
      "address",
      "workingDays",
      "workingHours",
      "location",
      "paymentMethods"
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updated = await Vendor.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password -subscription"); // ✅ subscription excluded

    if (!updated) {
      return res.status(404).json({ msg: "Vendor not found" });
    }

    res.json({ msg: "Profile updated", vendor: updated });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Failed to update profile", error: err.message });
  }
};
