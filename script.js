const mongoose = require("mongoose");
const Vendor = require("./models/vendorSchema");
const Application = require("./models/Application");
const Job = require("./models/Job");
const dotenv = require("dotenv");
dotenv.config();
// 🧠 Change this to your actual connection string

async function updateJobHistories() {
  try {
    await mongoose.connect(process.env.MONGO_URI, );
    console.log("✅ Connected to MongoDB");

    const vendors = await Vendor.find();
    console.log(`🔍 Found ${vendors.length} vendors`);

    let totalUpdated = 0;

    for (const vendor of vendors) {
      // Find all approved applications for this vendor
      const approvedApplications = await Application.find({
        vendor: vendor._id,
        status: "approved",
      }).populate("job", "_id");

      if (approvedApplications.length === 0) continue;

      // Collect all job IDs
      const jobIds = approvedApplications.map((app) => app.job?._id).filter(Boolean);

      // Add new job IDs only (avoid duplicates)
      const newJobs = jobIds.filter(
        (id) => !vendor.jobHistory.some((existingId) => existingId.toString() === id.toString())
      );

      if (newJobs.length > 0) {
        vendor.jobHistory.push(...newJobs);
        await vendor.save();
        totalUpdated++;
        console.log(`✅ Updated vendor ${vendor.name} (${vendor._id}) with ${newJobs.length} jobs`);
      }
    }

    console.log(`🎯 Update complete — ${totalUpdated} vendors modified`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Error updating vendor job histories:", err);
    process.exit(1);
  }
}

updateJobHistories();
