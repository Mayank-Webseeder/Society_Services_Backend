const Application = require("../../models/Application");
const Job = require("../../models/Job");


exports.getJobStats = async (req, res) => {
  try {
    const filter = req.query.filter || "week"; // week | month | year
    const now = new Date();
    let startDate, endDate;

    // optional query params
    const selectedMonth = parseInt(req.query.month); // 1–12
    const selectedYear = parseInt(req.query.year);

    if (filter === "week") {
      // 🗓️ Current week (Sunday–Saturday)
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }

    else if (filter === "month") {
      // 📅 Specific month of current year (or default current month)
      const year = selectedYear && !isNaN(selectedYear) ? selectedYear : now.getFullYear();
      const month = selectedMonth && !isNaN(selectedMonth) && selectedMonth >= 1 && selectedMonth <= 12 
        ? selectedMonth - 1 // JS months are 0-based
        : now.getMonth();

      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    }

    else if (filter === "year") {
      // 📆 Specific or current year
      const year = selectedYear && !isNaN(selectedYear) ? selectedYear : now.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    else {
      return res.status(400).json({ msg: "Invalid filter. Use week, month, or year." });
    }

    // Fetch jobs within range
    const jobs = await Job.find({ createdAt: { $gte: startDate, $lte: endDate } });

    let stats = [];

    // WEEKLY: jobs per day
    if (filter === "week") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      stats = days.map((day, i) => {
        const dayStart = new Date(startDate);
        dayStart.setDate(startDate.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const count = jobs.filter(j => j.createdAt >= dayStart && j.createdAt <= dayEnd).length;
        return { day, count };
      });
    }

    // MONTHLY: 5-day segments
    else if (filter === "month") {
      const daysInMonth = endDate.getDate();
      const segments = Math.ceil(daysInMonth / 5);
      stats = Array.from({ length: segments }, (_, i) => {
        const startDay = i * 5 + 1;
        const endDay = Math.min(startDay + 4, daysInMonth);
        const segStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDay);
        const segEnd = new Date(startDate.getFullYear(), startDate.getMonth(), endDay, 23, 59, 59, 999);
        const count = jobs.filter(j => j.createdAt >= segStart && j.createdAt <= segEnd).length;
        return { range: `${startDay}-${endDay}`, count };
      });
    }

    // YEARLY: jobs per month
    else if (filter === "year") {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      stats = months.map((month, i) => {
        const monthStart = new Date(startDate.getFullYear(), i, 1);
        const monthEnd = new Date(startDate.getFullYear(), i + 1, 0, 23, 59, 59, 999);
        const count = jobs.filter(j => j.createdAt >= monthStart && j.createdAt <= monthEnd).length;
        return { month, count };
      });
    }

    res.status(200).json({
      success: true,
      filter,
      range: { startDate, endDate },
      stats,
      totalJobs: jobs.length,
    });
  } catch (err) {
    console.error("Error fetching job stats:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch job statistics",
      error: err.message,
    });
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