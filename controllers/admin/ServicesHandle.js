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
		const { identifiers } = req.body;
		/**
		 * Expected body:
		 * {
		 *   "identifiers": ["Plumber", "670e19b54c28d2b29d1b5c12"]
		 * }
		 */

		if (!Array.isArray(identifiers) || identifiers.length === 0) {
			return res.status(400).json({ msg: "Please provide service names or IDs to delete" });
		}

		// Split input into names and IDs
		const nameFilters = identifiers.filter((id) => isNaN(id) && id.length > 0);
		const idFilters = identifiers.filter((id) => /^[a-f\d]{24}$/i.test(id));

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
