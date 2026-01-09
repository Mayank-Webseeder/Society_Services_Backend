const ServiceCategory = require("../../models/ServiceCategory");
const Service = require("../../models/Services");

// ADD CATEGORY
exports.addCategory = async (req, res) => {
  try {
    const { serviceId, name } = req.body;

    // check service exists
    const serviceExists = await Service.findById(serviceId);
    if (!serviceExists) {
      return res.status(404).json({ message: "Service not found" });
    }

    // prevent duplicate category per service
    const alreadyExists = await ServiceCategory.findOne({
      service: serviceId,
      name,
    });

    if (alreadyExists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await ServiceCategory.create({
      service: serviceId,
      name,
    });

    res.status(201).json({
      success: true,
      category,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
