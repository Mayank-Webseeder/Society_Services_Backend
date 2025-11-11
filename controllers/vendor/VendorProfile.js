const Vendor = require("../../models/vendorSchema");
const Application = require("../../models/Application");
const Job = require("../../models/Job");
const Feedback = require("../../models/FeedbackSchema.js");
const SupportRequest = require("../../models/SupportSchema.js");
exports.getMyApplications = async (req, res) => {
	try {
		const applications = await Application.find({ vendor: req.user.id })
			.populate({
				path: "job",
				populate: {
					path: "society",
					select: "username email buildingName address residentsCount location"
				}
			})
			.lean();
			console.log(req.user.id," ",applications);
		res.json(applications);
	} catch (err) {
		console.error("Error in getMyApplications:", err);
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
		const allowedFields = [
			"name",
			"businessName",
			"profilePicture",
			"contactNumber",
			"experience",
			"services",
			"address",
			"location",
			"paymentMethods",
			"idProof",
			"email"
		];

		const updates = {};
		
		for (const key of allowedFields) {
			if (req.body[key] !== undefined) {
					updates[key] = req.body[key];
			}
		}

		const updated = await Vendor.findByIdAndUpdate(req.user.id, updates, {
			new: true,
		}).select("-password -subscription");

		if (!updated) {
			return res.status(404).json({ msg: "Vendor not found" });
		}

		res.json({ msg: "Profile updated", vendor: updated });
	} catch (err) {
		res.status(500).json({ msg: "Failed to update profile", error: err.message });
	}
};

exports.getRating = async (req, res) => {
	try {
		const vendorId = req.user.id;

		const vendor = await Vendor.findById(vendorId);
		if (!vendor) return res.status(404).json({ msg: "Vendor not found" });

		res.status(200).json({
			averageRating: vendor.averageRating || 0,
			totalRatings: vendor.totalRatings || 0,
		});
	} catch (err) {
		console.error("Error fetching vendor rating:", err);
		res.status(500).json({ msg: "Failed to fetch rating", error: err.message });
	}
};

// GET /api/vendor/getFeedbacks
exports.getFeedbacks = async (req, res) => {
	try {
		const vendorId = req.user.id;

		const feedbacks = await Feedback.find({ vendor: vendorId })
			.populate("society", "username profilePicture buildingName")
			.populate("job", "title type scheduledFor")
			.sort({ createdAt: -1 });

		res.status(200).json({ feedbacks });
	} catch (err) {
		console.error("Error fetching vendor feedbacks:", err);
		res.status(500).json({ msg: "Failed to fetch feedbacks", error: err.message });
	}
};
exports.createSupportRequest = async (req, res) => {
  try {
	  const { message } = req.body;
	  const vendor = req.user.id;
    const imageUrl = req.body.imageUrl || null; // set by uploadHelpImage middleware

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const supportRequest = await SupportRequest.create({
      vendor,
      message,
      imageUrl,
    });

    res.status(201).json({
      success: true,
      message: "Support request submitted successfully",
      supportRequest,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
