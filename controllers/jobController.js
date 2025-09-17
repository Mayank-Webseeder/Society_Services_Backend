const Job = require("../models/Job");
const Application = require("../models/Application");
const Vendor = require("../models/vendorSchema");
const Notification = require("../models/Notification");
const { sendJobNotification } = require("../utils/sendJobNotification");

// 1. Society Creates a Job
exports.createJob = async (req, res) => {
  try {
    const {
      title,
      type,
      requiredExperience,
      details,
      contactNumber,
      location,
      offeredPricing,
      scheduledFor,
      quotationRequired,
    } = req.body;

    const { latitude, longitude, googleMapLink } = location;

    const newJob = new Job({
      society: req.user.id,
      title,
      type,
      requiredExperience,
      details,
      contactNumber,
      location: {
        latitude,
        longitude,
        googleMapLink,
      },
      geo: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      offeredPrice: offeredPricing,
      scheduledFor,
      quotationRequired: quotationRequired || false,
      isActive: true,
    });

    await newJob.save();

    // Notify all nearby, subscribed vendors matching role
    const nearbyVendors = await Vendor.find({
      services: type,
      isSubscribed: true,
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 20000,
        },
      },
    });

    for (const vendor of nearbyVendors) {
      await sendJobNotification(vendor, newJob);

      await Notification.create({
        userId: vendor._id,
        title: `New ${type} job posted`,
        message: `${title} - ${details}`,
        link: `/vendor/jobs/${newJob._id}`,
      });
    }

    res.status(201).json({
      msg: "Job posted successfully",
      job: {
        ...newJob.toObject(),
        status: "New",
      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to post job", error: err.message });
  }
};

// 2. Vendor: Get Jobs Nearby (with application status)
exports.getNearbyJobs = async (req, res) => {
  try {
    const { longitude, latitude, quotationRequired } = req.query;
    const vendorId = req.user.id;

    const filter = {
      geo: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 20000,
        },
      },
      isActive: true,
      status: { $ne: "Expired" }, // Exclude expired jobs
    };

    if (quotationRequired === "true") filter.quotationRequired = true;
    else if (quotationRequired === "false") filter.quotationRequired = false;

    const jobs = await Job.find(filter);
    const jobIds = jobs.map((job) => job._id);

    const vendorApplications = await Application.find({
      vendor: vendorId,
      job: { $in: jobIds },
    }).select("job status applicationType");

    const statusMap = {};
    vendorApplications.forEach((app) => {
      statusMap[app.job.toString()] = {
        status: app.status,
        type: app.applicationType,
      };
    });

    const formattedJobs = jobs.map((job) => ({
      _id: job._id,
      title: job.title,
      type: job.type,
      requiredExperience: job.requiredExperience,
      details: job.details,
      contactNumber: job.contactNumber,
      location: job.location,
      offeredPricing: job.offeredPrice,
      quotationRequired: job.quotationRequired,
      scheduledFor: job.scheduledFor,
      status: job.status,
      applicationStatus: statusMap[job._id.toString()] || null,
      postedAt: new Date(job.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    }));

    res.json(formattedJobs);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching nearby jobs", error: err.message });
  }
};

// 3. Get Single Job by ID
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("society", "name email");
    if (!job) return res.status(404).json({ msg: "Job not found" });

    res.json(job);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching job", error: err.message });
  }
};

// 4. Get All Jobs Posted by Society
exports.getMyPostedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ society: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching posted jobs", error: err.message });
  }
};

// 5. (Optional) Filter Jobs by Type and Date Range
exports.filterJobsByTypeAndDate = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    const filter = {};

    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ msg: "Failed to filter jobs", error: err.message });
  }
};

// 6. Expire Jobs Older Than 90 Days
exports.expireOldJobs = async (req, res) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const jobsToExpire = await Job.find({
      createdAt: { $lt: ninetyDaysAgo },
      status: { $nin: ["Completed", "Expired"] },
    });

    for (const job of jobsToExpire) {
      job.status = "Expired";
      await job.save();
    }

    res.json({ msg: `${jobsToExpire.length} job(s) marked as Expired.` });
  } catch (err) {
    res.status(500).json({ msg: "Failed to expire old jobs", error: err.message });
  }
};
exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findByIdAndDelete(jobId);
    if (!job) return res.status(404).json({ msg: "Job not found" });
    res.json({ msg: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};