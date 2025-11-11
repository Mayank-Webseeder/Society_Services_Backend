require("dotenv").config();
const mongoose = require("mongoose");
const Vendor = require("./models/vendorSchema");
const Services = require("./models/Services");

const MONGO_URI = process.env.MONGO_URI || "your_mongo_uri_here";

(async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!");

    // ✅ Directly access the collection, bypassing schema type casting
    const rawVendors = await mongoose.connection.db
      .collection("vendors")
      .find({ services: { $exists: true, $ne: [] } })
      .toArray();

    if (!rawVendors.length) {
      console.log("⚠️ No vendors with services found in raw collection.");
      process.exit(0);
    }

    let totalUpdated = 0;

    for (const vendor of rawVendors) {
      if (!Array.isArray(vendor.services) || vendor.services.length === 0) {
        console.log(`⚠️ Skipping ${vendor.name} — no services`);
        continue;
      }

      const cleanedServiceNames = vendor.services
        .filter((s) => typeof s === "string")
        .map((s) => s.replace(/[,]+$/g, "").trim())
        .filter((s) => s.length > 0);

      if (cleanedServiceNames.length === 0) {
        console.log(`⚠️ Skipping ${vendor.name} — invalid service names`);
        continue;
      }

      // Case-insensitive match
      let matchedServices = await Services.find({
        $or: cleanedServiceNames.map((name) => ({
          name: new RegExp(`^${name}$`, "i"),
        })),
      });

      // Auto-create missing
      const existingNames = matchedServices.map((s) => s.name.toLowerCase());
      const missingNames = cleanedServiceNames.filter(
        (n) => !existingNames.includes(n.toLowerCase())
      );

      for (const name of missingNames) {
        const created = await Services.create({ name, price: 999 });
        console.log(`🆕 Created missing service: ${created.name}`);
        matchedServices.push(created);
      }

      const serviceIds = matchedServices.map((s) => s._id);

      // ✅ Update the vendor directly in the collection
      await mongoose.connection.db
        .collection("vendors")
        .updateOne(
          { _id: vendor._id },
          { $set: { services: serviceIds } }
        );

      totalUpdated++;
      console.log(
        `✅ Updated vendor: ${vendor.name} → ${matchedServices
          .map((s) => s.name)
          .join(", ")}`
      );
    }

    console.log(`🎉 Migration complete! Vendors updated: ${totalUpdated}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
})();
