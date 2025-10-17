const SupportRequest = require("../../models/SupportSchema");
exports.getAllSupportRequests = async (req, res) => {
  try {
    const requests = await SupportRequest.find()
      .populate("vendor", "name businessName email") // include vendor info
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Update support request status (Admin)
exports.updateSupportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending",  "resolved"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const updatedRequest = await SupportRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Support request not found" });
    }

    res.status(200).json({ success: true, message: "Status updated", updatedRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};