const Services = require("../../models/Services");
const { refreshServices } = require("../../utils/fetchServices");

exports.addServices = async (req, res) => {
	try {
		const { services } = req.body;
		/**
		 * Expected body format:
		 * {
		 *   "services": [
		 *     { "name": "Electrician", "price": 1200, "description": "All electrical work" },
		 *     { "name": "Plumber", "price": 999 }
		 *   ]
		 * }
		 */

		if (!services || !Array.isArray(services) || services.length === 0) {
			return res.status(400).json({ msg: "Please provide an array of services" });
		}

		// Clean input: trim names & remove duplicates by name
		const cleaned = services
			.map((s) => ({
				name: s.name?.trim(),
				price: s.price || 999,
				description: s.description?.trim() || "",
			}))
			.filter((s) => s.name);

		const uniqueNames = [...new Set(cleaned.map((s) => s.name.toLowerCase()))];

		// Find already existing services
		const existing = await Services.find({
			name: { $in: uniqueNames.map((n) => new RegExp(`^${n}$`, "i")) },
		});

		const existingNames = existing.map((s) => s.name.toLowerCase());
		const newServices = cleaned.filter((s) => !existingNames.includes(s.name.toLowerCase()));

		if (newServices.length === 0) {
			return res.status(400).json({ msg: "All provided services already exist" });
		}

		// Insert new services
		const added = await Services.insertMany(newServices);
		await refreshServices();

		res.status(201).json({
			msg: "Services added successfully",
			addedCount: added.length,
			added,
		});
	} catch (err) {
		console.error("❌ Error adding services:", err);
		res.status(500).json({
			msg: "Failed to add services",
			error: err.message,
		});
	}
};
exports.deleteServices = async (req, res) => {
	try {
		const { services } = req.body;
		/**
		 * Expected body:
		 * {
		 *   "services": ["Plumber", "670e19b54c28d2b29d1b5c12"]
		 * }
		 */

		if (!Array.isArray(services) || services.length === 0) {
			return res.status(400).json({ msg: "Please provide service names or IDs to delete" });
		}

		// Split input into names and IDs
		const nameFilters = services.filter((id) => isNaN(id) && id.length > 0);
		const idFilters = services.filter((id) => /^[a-f\d]{24}$/i.test(id));

		const result = await Services.deleteMany({
			$or: [{ name: { $in: nameFilters } }, { _id: { $in: idFilters } }],
		});

		await refreshServices();

		res.json({
			msg: "Services deleted successfully",
			deletedCount: result.deletedCount,
		});
	} catch (err) {
		console.error("❌ Error deleting services:", err);
		res.status(500).json({
			msg: "Failed to delete services",
			error: err.message,
		});
	}
};

/**
 * 🧠 Admin API → Update Service Price
 * - Supports updating one or multiple services by name or ID
 * - Automatically validates if service exists
 */
exports.updateServicePrices = async (req, res) => {
  try {
    const { updates } = req.body;
    /**
     * Expected payload format:
     * {
     *   "updates": [
     *     { "name": "Plumber", "price": 1200 },
     *     { "id": "690439b56f3fd9f0c0038c60", "price": 1500 }
     *   ]
     * }
     */

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ msg: "Please provide at least one update object" });
    }

    const results = [];
    const notFound = [];
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    for (const item of updates) {
      const filter = item.id && objectIdRegex.test(item.id)
        ? { _id: item.id }
        : { name: new RegExp(`^${item.name.trim()}$`, "i") };

      const updated = await Services.findOneAndUpdate(
        filter,
        { price: item.price },
        { new: true }
      );

      if (updated) {
        results.push({ name: updated.name, newPrice: updated.price });
      } else {
        notFound.push(item.name || item.id);
      }
    }

    return res.status(200).json({
      msg: "Service price update process completed",
      updated: results,
      notFound,
    });
  } catch (err) {
    console.error("❌ Error updating service prices:", err);
    res.status(500).json({
      msg: "Failed to update service prices",
      error: err.message,
    });
  }
};
