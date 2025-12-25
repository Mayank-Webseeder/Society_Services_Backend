const Service = require("../../models/Services");
const ServiceCategory = require("../../models/ServiceCategory");

/**
 * ===============================
 * CREATE SERVICE
 * POST /api/admin/services
 * ===============================
 */
exports.createService = async (req, res) => {
  try {
    const { name, price, description } = req.body;

    // basic validation
    if (!name || !price) {
      return res.status(400).json({
        message: "Name and price are required",
      });
    }

    // check duplicate service
    const exists = await Service.findOne({ name: name.trim() });
    if (exists) {
      return res.status(400).json({
        message: "Service already exists",
      });
    }

    const service = await Service.create({
      name: name.trim(),
      price,
      description,
    });

    res.status(201).json({
      success: true,
      service,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * =====================================
 * GET SERVICES WITH THEIR CATEGORIES
 * GET /api/admin/services/with-categories
 * =====================================
 */
exports.getServicesWithCategories = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true });

    const data = await Promise.all(
      services.map(async (service) => {
        const categories = await ServiceCategory.find({
          service: service._id,
          isActive: true,
        }).select("_id name");

        return {
          _id: service._id,
          name: service.name,
          price: service.price,
          description: service.description,
          categories,
        };
      })
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
