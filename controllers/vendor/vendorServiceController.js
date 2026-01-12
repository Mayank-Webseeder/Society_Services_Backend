const VendorService = require("../../models/VendorService");
const Service = require("../../models/Services");
const ServiceCategory = require("../../models/ServiceCategory");

/**
 * ===================================
 * ADD / UPDATE VENDOR SERVICE
 * POST /api/vendor/services/add
 * ===================================
 */
exports.addOrUpdateVendorService = async (req, res) => {
  try {
    const vendorId = req.user._id; // auth middleware se aata hai
    const { serviceId, categoryIds, experience } = req.body;

    if (!serviceId || !experience) {
      return res.status(400).json({
        message: "Service and experience are required",
      });
    }

    // 1️⃣ Service exists?
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // 2️⃣ Categories isi service ki honi chahiye
    if (categoryIds && categoryIds.length > 0) {
      const validCategories = await ServiceCategory.find({
        _id: { $in: categoryIds },
        service: serviceId,
        isActive: true,
      });

      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({
          message: "Invalid category for selected service",
        });
      }
    }

    // 3️⃣ Upsert (agar pehle se hai to update)
    const vendorService = await VendorService.findOneAndUpdate(
      { vendor: vendorId, service: serviceId },
      {
        vendor: vendorId,
        service: serviceId,
        categories: categoryIds || [],
        experience,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      vendorService,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * ===================================
 * GET VENDOR SERVICES
 * GET /api/vendor/services
 * ===================================
 */
exports.getVendorServices = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const services = await VendorService.find({
      vendor: vendorId,
      isActive: true,
    })
      .populate("service", "name price")
      .populate("categories", "name");

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
