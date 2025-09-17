const Job = require("../models/Job");

// Run this once per day — integrate in cron/index.js if using centralized scheduler
const expireOldJobs = async () => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const jobsToExpire = await Job.find({
    createdAt: { $lt: ninetyDaysAgo },
    status: { $nin: ["Completed", "Expired"] },
  });

  for (const job of jobsToExpire) {
    job.status = "Expired";
    await job.save();
  }

  console.log(`${jobsToExpire.length} jobs marked as expired`);
};

module.exports = expireOldJobs;
