const Job = require("../../models/Job");

exports.getJobStats = async (req, res) => {
  try {
    const filter = req.query.filter || "week"; // Default to 'week'
    const now = new Date();
    let startDate;

    if (filter === "week") {
      const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek); // Start from Sunday
    } else if (filter === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st day of the month
    } else if (filter === "year") {
      startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st
    } else {
      return res.status(400).json({ msg: "Invalid filter. Use 'week', 'month', or 'year'." });
    }

    const jobs = await Job.find({ createdAt: { $gte: startDate } });

    // Initialize counters
    const stats = {
      filter,
      generated: jobs.length,
      completed: 0,
      expired: 0,
      cancelled: 0,
      ongoing: 0,
    };

    for (const job of jobs) {
      switch (job.status) {
        case "Completed":
          stats.completed++;
          break;
        case "Expired":
          stats.expired++;
          break;
        case "Cancelled":
          stats.cancelled++;
          break;
        case "Ongoing":
          stats.ongoing++;
          break;
        default:
          break;
      }
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch job stats", error: err.message });
  }
};
