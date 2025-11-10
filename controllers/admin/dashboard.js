const Society = require("../../models/SocietySchema");
const Vendor = require("../../models/vendorSchema");
const Job = require("../../models/Job");

exports.getDashboardStats = async (req, res) => {
  try {
    // 🏢 Total societies
    const totalSocieties = await Society.countDocuments();

    // ⏳ Approval pending societies
    const pendingSocieties = await Society.countDocuments({ isApproved: false });

    // 👷 Total vendors
    const totalVendors = await Vendor.countDocuments();

    // 💳 Active subscriptions (vendors with active subscriptions)
    const activeSubscriptions = await Vendor.countDocuments({ "subscription.isActive": true });
    const [newJobs, completedJobs, expiredJobs] = await Promise.all([
      Job.countDocuments({ status: "New" }),
      Job.countDocuments({ status: "Completed" }),
      Job.countDocuments({ status: "Expired" }),
    ]);
    res.status(200).json({
      success: true,
        stats: {
            societies: {
                total: totalSocieties,
                pendingApproval: pendingSocieties,
            },
            vendors: {
                total: totalVendors,
                activeSubscriptions,
            },
            jobs: {
                new: newJobs,
                completed: completedJobs,
                expired: expiredJobs,
            },
        },
    });
  } catch (err) {
    console.error("❌ Error fetching admin stats:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch admin statistics",
      error: err.message,
    });
  }
};
exports.getTopVendors = async (req, res) => {
	try {
		const topVendors = await Vendor.aggregate([
			// 1️⃣ Only include approved and non-blacklisted vendors
			{
				$match: {
					isApproved: true,
					isBlacklisted: false,
				},
			},
			// 2️⃣ Lookup job history details
			{
				$lookup: {
					from: "jobs",
					localField: "jobHistory",
					foreignField: "_id",
					as: "jobDetails",
				},
			},
			// 3️⃣ Calculate completed jobs
			{
				$addFields: {
					completedJobsCount: {
						$size: {
							$filter: {
								input: "$jobDetails",
								as: "job",
								cond: { $eq: ["$$job.status", "Completed"] },
							},
						},
					},
				},
			},
			// 4️⃣ Compute performance score
			{
				$addFields: {
					performanceScore: {
						$add: [
							{ $multiply: ["$averageRating", 0.5] },
							{ $multiply: [{ $divide: ["$totalRatings", 100] }, 0.2] },
							{ $multiply: ["$completedJobsCount", 0.3] },
						],
					},
				},
			},
			// 5️⃣ Sort by performance score, rating, then jobs
			{
				$sort: {
					performanceScore: -1,
					averageRating: -1,
					completedJobsCount: -1,
				},
			},
			// 6️⃣ Limit to top 10
			{ $limit: 10 },
			// 7️⃣ Select fields to return
			{
				$project: {
					name: 1,
					businessName: 1,
					averageRating: 1,
					totalRatings: 1,
					completedJobsCount: 1,
					performanceScore: 1,
					services: 1,
					profilePicture: 1,
				},
			},
		]);

		res.json({
			msg: "Top 10 performing vendors fetched successfully",
			count: topVendors.length,
			vendors: topVendors,
		});
	} catch (err) {
		res.status(500).json({
			msg: "Error fetching top performing vendors",
			error: err.message,
		});
	}
};
