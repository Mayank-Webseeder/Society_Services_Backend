const Application = require("../../models/Application");
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
const Services = require("../../models/Services");

exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate("society", "buildingName address location").sort({ createdAt: 1 }); // ascending order
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch jobs", error: err.message });
  }
};
exports.getJobbyId = async (req, res) => {
  try {
    const jobId = req.params.id;
    const jobs = await Job.findById(jobId)
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch jobs", error: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // 🔎 Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, msg: "Job not found" });
    }

    // 🗑️ Delete all applications related to this job
    const deletedApplications = await Application.deleteMany({ job: jobId });

    // 🗑️ Delete the job itself
    await Job.findByIdAndDelete(jobId);

    res.status(200).json({
      success: true,
      msg: "Job and related applications deleted successfully",
      deletedJobId: jobId,
      deletedApplicationsCount: deletedApplications.deletedCount,
    });
  } catch (err) {
    console.error("❌ Error deleting job:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to delete job",
      error: err.message,
    });
  }
};

// ➕ Add one or more services