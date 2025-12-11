// scripts/fixSubscriptions.js
require("dotenv").config();
const mongoose = require("mongoose");

// adjust paths if your models are in different places
const Subscription = require("./models/Subscription");
const Services = require("./models/Services");

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set. Set MONGO_URI or DATABASE_URL in env.");
  process.exit(1);
}

const DRY_RUN = (process.env.DRY_RUN || "true").toLowerCase() !== "false";

async function main() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ Connected to MongoDB");

    // Fetch all subscriptions that look "old" or all if you want
    const subscriptions = await Subscription.find({}) // you can narrow filter here
      .lean()
      .exec();

    console.log(`Found ${subscriptions.length} subscriptions to inspect.`);

    let updatedCount = 0;
    let skippedCount = 0;
    const notFoundServices = new Set();

    for (const sub of subscriptions) {
      try {
        const startDate = sub.startDate ? new Date(sub.startDate) : null;
        if (!startDate) {
          console.warn(`⚠️ Subscription ${sub._id} has no startDate — skipping.`);
          skippedCount++;
          continue;
        }

        // Rule: end date should be (startDate + 1 year) - 1 day, at 23:59:59.999
        // Example: buy on Dec 12, 2025 -> end on Dec 11, 2026 23:59:59.999
        const newEnd = new Date(startDate);
        newEnd.setFullYear(newEnd.getFullYear() + 1);
        newEnd.setDate(newEnd.getDate() - 1);
        newEnd.setHours(23, 59, 59, 999);

        // If already matches, and planPrice matches recomputed total, skip
        const endSame = sub.endDate && new Date(sub.endDate).getTime() === newEnd.getTime();

        // For recalculation get actual service docs from Services collection
        // subscription.services may store { name, service (id?), addedOn, proratedPrice }
        const svcEntries = Array.isArray(sub.services) ? sub.services : [];

        // Build list of names and ids to lookup
        const namesToLookup = svcEntries
          .map((s) => (s && s.name ? s.name.trim() : null))
          .filter(Boolean);

        // Query by name case-insensitively
        const serviceDocs = await Services.find({
          name: { $in: namesToLookup.map((n) => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) },
        }).lean();

        // Build mapping name(lower)->doc
        const svcByName = {};
        for (const sd of serviceDocs) {
          svcByName[sd.name.toLowerCase()] = sd;
        }

        // Recompute plan price as sum of canonical service prices where found,
        // fallback to existing proratedPrice if not found.
        let recomputedPlan = 0;
        const updatedServices = svcEntries.map((entry) => {
          const entryName = entry.name ? entry.name.trim() : null;
          if (entryName && svcByName[entryName.toLowerCase()]) {
            const canonical = svcByName[entryName.toLowerCase()];
            recomputedPlan += canonical.price || 0;

            return {
              ...entry,
              proratedPrice: canonical.price || entry.proratedPrice || 0,
            };
          } else {
            // service not found in Services collection
            notFoundServices.add(entryName || "UNKNOWN");
            recomputedPlan += entry.proratedPrice || 0; // fallback
            return entry; // leave as-is
          }
        });

        const planChanged = sub.planPrice !== recomputedPlan;
        const needUpdate = !endSame || planChanged;

        console.log(`Sub ${sub._id}: start=${startDate.toISOString().split("T")[0]}, oldEnd=${sub.endDate ? new Date(sub.endDate).toISOString() : "N/A"}, newEnd=${newEnd.toISOString()}, oldPlan=${sub.planPrice}, newPlan=${recomputedPlan} -> needUpdate=${needUpdate}`);

        if (needUpdate) {
          if (DRY_RUN) {
            console.log(`DRY RUN: would update subscription ${sub._id}`);
            updatedCount++;
          } else {
            // perform update
            await Subscription.findByIdAndUpdate(
              sub._id,
              {
                $set: {
                  endDate: newEnd,
                  planPrice: recomputedPlan,
                  services: updatedServices,
                  updatedAt: new Date(),
                },
              },
              { new: true }
            );
            console.log(`✅ Updated subscription ${sub._id}`);
            updatedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (e) {
        console.error(`❌ Failed processing subscription ${sub._id}:`, e.message || e);
      }
    } // for each sub

    console.log("------- SUMMARY -------");
    console.log(`DRY_RUN: ${DRY_RUN}`);
    console.log(`processed: ${subscriptions.length}`);
    console.log(`updated (or would update): ${updatedCount}`);
    console.log(`skipped (no change): ${skippedCount}`);
    if (notFoundServices.size) {
      console.log("Services not found in Services collection (left as-is):", Array.from(notFoundServices).slice(0, 50));
    }

    await mongoose.disconnect();
    console.log("Disconnected. Done.");
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(2);
  }
}

main();
