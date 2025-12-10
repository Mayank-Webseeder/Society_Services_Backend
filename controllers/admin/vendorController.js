const Vendor = require("../../models/vendorSchema");
const Services = require("../../models/Services");
const Application = require("../../models/Application");
const Subscription = require("../../models/Subscription");
const Notification = require("../../models/Notification");
const SupportRequest = require("../../models/SupportSchema");
const mongoose = require("mongoose");
// ✅ Get pending vendors
exports.getPendingVendors = async (req, res) => {
	try {
		const vendors = await Vendor.find({
			_id: { $ne: process.env.DUMMY_VENDOR },
			isApproved: false,
			isBlacklisted: false,
		}).select("name email contactNumber");

		res.json(vendors);
	} catch (err) {
		res.status(500).json({ msg: "Failed to fetch pending vendors", error: err.message });
	}
};

// ✅ Approve vendor
exports.approveVendor = async (req, res) => {
	try {
		if (req.params.vendorId === process.env.DUMMY_VENDOR) return res.status(400).json({ msg: "Cannot modify dummy vendor" });
		const vendor = await Vendor.findByIdAndUpdate(req.params.vendorId, { isApproved: true }, { new: true });

		if (!vendor) return res.status(404).json({ msg: "Vendor not found" });

		res.json({ msg: "Vendor approved successfully", vendor });
	} catch (err) {
		res.status(500).json({ msg: "Failed to approve vendor", error: err.message });
	}
};

// ✅ Blacklist vendor
exports.blacklistVendor = async (req, res) => {
	try {
		const { reason } = req.body;
		if (req.params.vendorId === process.env.DUMMY_VENDOR) return res.status(400).json({ msg: "Cannot modify dummy vendor" });

		const vendor = await Vendor.findByIdAndUpdate(
			req.params.vendorId,
			{ isBlacklisted: true, blacklistReason: reason },
			{ new: true }
		);

		if (!vendor) return res.status(404).json({ msg: "Vendor not found" });

		res.json({ msg: "Vendor blacklisted", vendor });
	} catch (err) {
		res.status(500).json({ msg: "Failed to blacklist vendor", error: err.message });
	}
};

// ✅ Get all blacklisted vendors
exports.getBlacklistedVendors = async (req, res) => {
	try {
		const vendors = await Vendor.find({ isBlacklisted: true }).select(
			"name email contactNumber businessName profilePicture address services idProof blacklistReason "
		);
		res.json(vendors);
	} catch (err) {
		res.status(500).json({ msg: "Failed to fetch blacklisted vendors", error: err.message });
	}
};

// ✅ Get all vendors (optional utility route)
exports.getAllVendors = async (req, res) => {
	try {
		const vendors = await Vendor.find({
			_id: { $ne: process.env.DUMMY_VENDOR }, // 🚫 exclude dummy vendor
		}).select("name email contactNumber idProof role isApproved isBlacklisted ");
		res.json(vendors);
	} catch (err) {
		res.status(500).json({ msg: "Failed to fetch vendors", error: err.message });
	}
};

// ✅ Group vendors by role (if needed)
exports.getVendorsGroupedByRole = async (req, res) => {
	try {
		const vendors = await Vendor.aggregate([
			{
				$match: {
					_id: { $ne: new mongoose.Types.ObjectId(process.env.DUMMY_VENDOR) },
					isApproved: true,
					isBlacklisted: false,
				},
			},

			{ $unwind: "$services" },
			{
				$group: {
					_id: "$services",
					vendors: { $push: { name: "$name", email: "$email", phone: "$phone" } },
				},
			},
		]);

		res.json(vendors);
	} catch (err) {
		res.status(500).json({ msg: "Failed to group vendors by role", error: err.message });
	}
};
const servicesList = require("../../constants/vendorRoles");
exports.getAllServices = async (req, res) => {
	try {
		const services = await Services.find().sort({ name: 1 });
		res.json({ total: services.length, services });
	} catch (err) {
		res.status(500).json({ msg: "Failed to fetch services", error: err.message });
	}
};
exports.getAllVendorsProfile = async (req, res) => {
	try {
		const vendors = await Vendor.find({ _id: { $ne: process.env.DUMMY_VENDOR} }).select(
			"name email contactNumber businessName profilePicture address averageRating totalRatings experience services location idProof role isApproved isBlacklisted blacklistReason"
		).populate('services',"name price description");
		res.json(vendors);
	} catch (err) {
		res.status(500).json({ msg: "Failed to fetch vendors", error: err.message });
	}
};
exports.getVendorsProfile = async (req, res) => {
	try {
		const id = req.params.id;
		if (id === process.env.DUMMY_VENDOR) {
			return res.status(404).json({ msg: "Vendor not found" });
		}
		const vendors = await Vendor.findById(id).select(
			"name email contactNumber businessName profilePicture address averageRating totalRatings experience services location idProof role isApproved isBlacklisted blacklistReason"
		);
		res.json(vendors);
	} catch (err) {
		res.status(500).json({ msg: "Failed to fetch vendors", error: err.message });
	}
};

exports.adminDeleteVendor = async (req, res) => {
	try {
		const vendorId = req.params.vendorId;
		const DUMMY_VENDOR = process.env.DUMMY_VENDOR;

		if (!DUMMY_VENDOR) {
			return res.status(500).json({
				msg: "Dummy vendor not configured in .env",
			});
		}

		// Check vendor exists
		const vendor = await Vendor.findById(vendorId);
		if (!vendor) {
			return res.status(404).json({ msg: "Vendor not found" });
		}

		// ❌ STEP 1: Prevent deletion if active subscription exists
		const activeSub = await Subscription.findOne({
			vendor: vendorId,
			isActive: true,
			subscriptionStatus: "Active",
			endDate: { $gt: new Date() },
		});

		if (activeSub) {
			return res.status(400).json({
				msg: "Vendor cannot be deleted because they have an active subscription.",
				subscriptionEndsOn: activeSub.endDate,
			});
		}

		// 🔁 STEP 2: Replace vendor in all related collections
		await Application.updateMany({ vendor: vendorId }, { $set: { vendor: DUMMY_VENDOR } });

		await Notification.updateMany({ vendor: vendorId }, { $set: { vendor: DUMMY_VENDOR } });

		await Subscription.updateMany({ vendor: vendorId }, { $set: { vendor: DUMMY_VENDOR } });

		await SupportRequest.updateMany({ vendor: vendorId }, { $set: { vendor: DUMMY_VENDOR } });

		// 🗑 STEP 3: Delete the vendor account
		await Vendor.findByIdAndDelete(vendorId);

		res.status(200).json({
			msg: "Vendor deleted successfully. All references transferred to dummy user.",
		});
	} catch (err) {
		console.error("❌ adminDeleteVendor error:", err);
		res.status(500).json({
			msg: "Failed to delete vendor",
			error: err.message,
		});
	}
};
