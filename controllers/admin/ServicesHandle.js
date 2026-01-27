const Services = require("../../models/Services");

/**
 * ===============================
 * 🟢 ADD SERVICES
 * ===============================
 */
exports.addServices = async (req, res) => {
  try {
    // Accept input from either `names` or `services`
    const inputServices = req.body?.names ?? req.body?.services ?? [];

    if (!Array.isArray(inputServices) || inputServices.length === 0) {
      return res.status(400).json({
        msg: "Please provide an array in body.names or body.services",
      });
    }

    // Normalize incoming services
    const formattedServices = inputServices
      .map((entry) => {
        if (!entry) return null;

        // String input → default service
        if (typeof entry === "string") {
          const cleanName = entry.trim();
          return cleanName
            ? { name: cleanName, price: 999, description: "" }
            : null;
        }

        // Object input → { name, price?, description? }
        const cleanName = String(entry.name || "").trim();
        if (!cleanName) return null;

        return {
          name: cleanName,
          price: Number(entry.price) || 999,
          description: String(entry.description || "").trim(),
        };
      })
      .filter(Boolean);

    if (!formattedServices.length) {
      return res.status(400).json({ msg: "No valid services found" });
    }

    // Deduplicate by name (case-insensitive)
    const dedupedMap = new Map();
    for (const svc of formattedServices) {
      const key = svc.name.toLowerCase();
      if (!dedupedMap.has(key)) dedupedMap.set(key, svc);
    }

    const uniqueServices = [...dedupedMap.values()];

    // Prepare regex for case-insensitive DB lookup
    const nameRegexList = uniqueServices.map(
      (svc) =>
        new RegExp(
          `^${svc.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        )
    );

    // Find already existing services
    const existingServices = await Services.find({
      name: { $in: nameRegexList },
    }).select("name");

    const existingLowerNames = existingServices.map((s) =>
      s.name.toLowerCase()
    );

    // Filter new services only
    const servicesToInsert = uniqueServices.filter(
      (svc) => !existingLowerNames.includes(svc.name.toLowerCase())
    );

    if (!servicesToInsert.length) {
      return res.status(400).json({
        msg: "All provided services already exist",
      });
    }

    const inserted = await Services.insertMany(servicesToInsert, {
      ordered: false,
    });

    res.status(201).json({
      msg: "Services added successfully",
      addedCount: inserted.length,
      added: inserted,
    });
  } catch (err) {
    console.error("❌ addServices error:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        msg: "Duplicate service detected",
        error: err.message,
      });
    }

    res.status(500).json({
      msg: "Failed to add services",
      error: err.message,
    });
  }
};

/**
 * ===============================
 * 🔴 DELETE SERVICES
 * ===============================
 */
exports.deleteServices = async (req, res) => {
  try {
    const payload = req.body?.names ?? req.body?.services ?? [];

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({
        msg: "Provide service names or IDs in body",
      });
    }

    const objectIdPattern = /^[a-f\d]{24}$/i;

    const namesToDelete = payload.filter(
      (val) => typeof val === "string" && !objectIdPattern.test(val)
    );

    const idsToDelete = payload.filter(
      (val) => typeof val === "string" && objectIdPattern.test(val)
    );

    

    const deletionResult = await Services.deleteMany({
      $or: [{ name: { $in: namesToDelete } }, { _id: { $in: idsToDelete } }],
    });

    res.json({
      msg: "Services deleted successfully",
      deletedCount: deletionResult.deletedCount,
    });
  } catch (err) {
    console.error("❌ deleteServices error:", err);
    res.status(500).json({
      msg: "Failed to delete services",
      error: err.message,
    });
  }
};

/**
 * ===============================
 * 🟡 UPDATE SERVICE PRICES
 * ===============================
 */
exports.updateServicePrices = async (req, res) => {
  try {
    const updatesList = req.body.updates;

    if (!Array.isArray(updatesList) || updatesList.length === 0) {
      return res.status(400).json({
        msg: "At least one update entry is required",
      });
    }

    const updatedServices = [];
    const notFoundServices = [];
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    for (const update of updatesList) {
      const query =
        update.id && objectIdRegex.test(update.id)
          ? { _id: update.id }
          : { name: new RegExp(`^${update.name.trim()}$`, "i") };

      const updatedDoc = await Services.findOneAndUpdate(
        query,
        { price: update.price },
        { new: true }
      );

      if (updatedDoc) {
        updatedServices.push({
          name: updatedDoc.name,
          newPrice: updatedDoc.price,
        });
      } else {
        notFoundServices.push(update.name || update.id);
      }
    }

    res.status(200).json({
      msg: "Service price update completed",
      updated: updatedServices,
      notFound: notFoundServices,
    });
  } catch (err) {
    console.error("❌ updateServicePrices error:", err);
    res.status(500).json({
      msg: "Failed to update service prices",
      error: err.message,
    });
  }
};
