const Society = require("../../models/SocietySchema");

// ✅ Approve Society
exports.approveSociety = async (req, res) => {
  try {
    const { societyId } = req.params;
    const society = await Society.findById(societyId);
    if (!society) return res.status(404).json({ msg: "Society not found" });
    if (society.isApproved) return res.status(400).json({ msg: "Already approved" });

    society.isApproved = true;
    await society.save();

    // optional email logic here

    res.status(200).json({ msg: "Society approved" });
  } catch (err) {
    res.status(500).json({ msg: "Error approving society", error: err.message });
  }
};

// ✅ Get Pending Societies
exports.getPendingSocieties = async (req, res) => {
  try {
    const pending = await Society.find({ isApproved: false });
    res.status(200).json({ societies: pending });
  } catch (err) {
    res.status(500).json({ msg: "Error fetching pending", error: err.message });
  }
};

// ✅ Get Approved Societies
exports.getApprovedSocieties = async (req, res) => {
  try {
    const approved = await Society.find({ isApproved: true });
    res.status(200).json({ societies: approved });
  } catch (err) {
    res.status(500).json({ msg: "Error fetching approved", error: err.message });
  }
};
