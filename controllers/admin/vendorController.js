const Vendor = require("../../models/vendorSchema");

// ✅ Get pending vendors
exports.getPendingVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isApproved: false, isBlacklisted: false }).select("name email phone");
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch pending vendors", error: err.message });
  }
};

// ✅ Approve vendor
exports.approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      { isApproved: true },
      { new: true }
    );

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
    const vendors = await Vendor.find({ isBlacklisted: true }).select("name email phone blacklistReason");
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch blacklisted vendors", error: err.message });
  }
};

// ✅ Get all vendors (optional utility route)
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().select("name email phone role isApproved isBlacklisted");
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch vendors", error: err.message });
  }
};

// ✅ Group vendors by role (if needed)
exports.getVendorsGroupedByRole = async (req, res) => {
  try {
    const vendors = await Vendor.aggregate([
      { $match: { isApproved: true, isBlacklisted: false } },
      { $unwind: "$services" },
      {
        $group: {
          _id: "$services",
          vendors: { $push: { name: "$name", email: "$email", phone: "$phone" } }
        }
      }
    ]);

    res.json(vendors);
  } catch (err) {
    res.status(500).json({ msg: "Failed to group vendors by role", error: err.message });
  }
};
