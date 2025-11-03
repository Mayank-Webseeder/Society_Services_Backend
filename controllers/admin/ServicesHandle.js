const Services = require("../../models/Services");
const { refreshServices } = require("../../utils/fetchServices");
exports.addServices = async (req, res) => {
  try {
    const { names } = req.body;

    // Validate input
    if (!names || (Array.isArray(names) && names.length === 0))
      return res.status(400).json({ msg: "Please provide at least one service name" });

    // Normalize input to array
    const serviceNames = Array.isArray(names) ? names : [names];

    // Remove duplicates and trim whitespace
    const cleanedNames = [...new Set(serviceNames.map((n) => n.trim()))].filter((n) => n);

    // Find existing services to avoid duplicates
    const existing = await Services.find({
      name: { $in: cleanedNames.map((name) => new RegExp(`^${name}$`, "i")) },
    });

    const existingNames = existing.map((s) => s.name.toLowerCase());
    const newServices = cleanedNames.filter(
      (name) => !existingNames.includes(name.toLowerCase())
    );

    if (newServices.length === 0) {
      return res.status(400).json({ msg: "All provided services already exist" });
    }

    // Insert all new services
    const added = await Services.insertMany(newServices.map((name) => ({ name })));
    await refreshServices();
    res.status(201).json({
      msg: "Services added successfully",
      addedCount: added.length,
      added,
    });
  } catch (err) {
    console.error("Error adding services:", err);
    res.status(500).json({
      msg: "Failed to add services",
      error: err.message,
    });
  }
};
exports.deleteServices = async (req, res) => {
  try {
    const { names } = req.body; // expecting an array of service names

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ msg: "Please provide an array of service names to delete" });
    }

    const result = await Services.deleteMany({ name: { $in: names } });

    res.json({
      msg: "Services deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting services:", err);
    res.status(500).json({ msg: "Failed to delete services", error: err.message });
  }
};
