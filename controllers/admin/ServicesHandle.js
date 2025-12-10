const Services = require("../../models/Services");
exports.addServices = async (req, res) => {
  try {
    // Accept both: { names: [...] } or { services: [...] }
    const rawInput = req.body?.names || req.body?.services || [];

    if (!Array.isArray(rawInput) || rawInput.length === 0) {
      return res.status(400).json({
        msg: "Please provide an array of services in body.names or body.services",
      });
    }

    // Normalize input: allow either strings or objects
    const normalized = rawInput
      .map((item) => {
        if (!item) return null;

        // string case → just the name
        if (typeof item === "string") {
          const nm = item.trim();
          return nm ? { name: nm, price: 999, description: "" } : null;
        }

        // object case { name, price?, description? }
        const nm = (item.name || "").toString().trim();
        if (!nm) return null;

        return {
          name: nm,
          price:
            typeof item.price === "number"
              ? item.price
              : parseInt(item.price) || 999,
          description: (item.description || "").toString().trim(),
        };
      })
      .filter(Boolean);

    if (normalized.length === 0) {
      return res.status(400).json({ msg: "No valid service names provided" });
    }

    // Remove duplicates by case-insensitive name
    const uniqueByNameMap = new Map();
    normalized.forEach((s) => {
      const key = s.name.toLowerCase();
      if (!uniqueByNameMap.has(key)) uniqueByNameMap.set(key, s);
    });
    const uniqueServices = Array.from(uniqueByNameMap.values());

    // Build regex list for case-insensitive matching
    const regexList = uniqueServices.map(
      (s) =>
        new RegExp(
          `^${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        )
    );

    // Find existing services (case-insensitive)
    const existing = await Services.find({ name: { $in: regexList } }).select(
      "name"
    );
    const existingNamesLower = existing.map((e) => e.name.toLowerCase());

    // Filter those that actually need insertion
    const toInsert = uniqueServices.filter(
      (s) => !existingNamesLower.includes(s.name.toLowerCase())
    );

    if (toInsert.length === 0) {
      return res
        .status(400)
        .json({ msg: "All provided services already exist" });
    }

    const added = await Services.insertMany(
      toInsert.map((s) => ({
        name: s.name,
        price: s.price,
        description: s.description,
      })),
      { ordered: false }
    );

    res.status(201).json({
      msg: "Services added successfully",
      addedCount: added.length,
      added,
    });
  } catch (err) {
    console.error("❌ Error adding services:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        msg: "Some services already exist (duplicate key)",
        error: err.message,
      });
    }
    res.status(500).json({
      msg: "Failed to add services",
      error: err.message,
    });
  }
};


exports.deleteServices = async (req, res) => {
  try {
    // Accept both: { names: [...] } or { services: [...] }
    const services = req.body?.names || req.body?.services || [];

    /**
     * Supported bodies:
     * {
     *   "names": ["Plumber", "Electrician"]
     * }
     * or
     * {
     *   "services": ["Plumber", "670e19b54c28d2b29d1b5c12"]
     * }
     */

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        msg: "Please provide service names or IDs to delete in body.names or body.services",
      });
    }

    // Split input into names and IDs
    const objectIdRegex = /^[a-f\d]{24}$/i;

    const nameFilters = services.filter(
      (val) => typeof val === "string" && !objectIdRegex.test(val) && val.length > 0
    );

    const idFilters = services.filter(
      (val) => typeof val === "string" && objectIdRegex.test(val)
    );

    console.log("Deleting services - Names:", nameFilters, "IDs:", idFilters);

    const result = await Services.deleteMany({
      $or: [
        { name: { $in: nameFilters } },
        { _id: { $in: idFilters } },
      ],
    });

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
			const filter =
				item.id && objectIdRegex.test(item.id)
					? { _id: item.id }
					: { name: new RegExp(`^${item.name.trim()}$`, "i") };

			const updated = await Services.findOneAndUpdate(filter, { price: item.price }, { new: true });

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

