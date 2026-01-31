const Job = require("../models/Job");
const Application = require("../models/Application");
const Vendor = require("../models/vendorSchema");
const Notification = require("../models/Notification");
const Society = require("../models/SocietySchema");

// 1. Society Creates a Job
exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== "society") {
      return res.status(403).json({
        success: false,
        msg: "Not authorized. Only societies can post jobs.",
      });
    }

    const {
      title,
      type,
      requiredExperience,
      details,
      contactNumber,
      location,
      offeredPrice,
      scheduledFor,
      quotationRequired,
    } = req.body;

    if (!location?.latitude || !location?.longitude) {
      return res.status(400).json({
        msg: "Location latitude and longitude are required",
      });
    }

    const latitude = parseFloat(location.latitude);
    const longitude = parseFloat(location.longitude);

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
        googleMapLink: `https://maps.google.com/?q=${latitude},${longitude}`,
      },

      // REQUIRED for nearby search
      geo: {
        type: "Point",
        coordinates: [longitude, latitude], // longitude FIRST
      },

      offeredPrice,
      scheduledFor,
      quotationRequired: quotationRequired || false,
      isActive: true,
    });

    await newJob.save();

    res.status(201).json({
      msg: "Job posted successfully",
      job: newJob,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: "Failed to post job",
      error: err.message,
    });
  }
};

//  Society: Get all applicants for a job
exports.getJobApplicants = async (req, res) => {
  try {
    const jobId = req.params.id;

    // safety check: job exists & belongs to this society
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    if (job.society.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const applications = await Application.find({ job: jobId })
      .populate("vendor", "name email contactNumber")
      .sort({ createdAt: -1 });

    const formatted = applications.map((app) => ({
      applicationId: app._id,
      vendorId: app.vendor?._id,

      name: app.vendor?.name || "-",
      email: app.vendor?.email || "-",
      contact: app.vendor?.contactNumber || "-",
      appliedDate: app.createdAt,
      applicationType: app.applicationType,
      status: app.status,
    }));

    res.status(200).json({
      success: true,
      applicants: formatted,
    });
  } catch (err) {
    console.error("getJobApplicants error:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch job applicants",
      error: err.message,
    });
  }
};

//  GET ALL JOBS (for society dashboard)
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ society: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error("Get all jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
    });
  }
};

// 2. Vendor: Get Jobs Nearby (with application status)
exports.getNearbyJobs = async (req, res) => {
  try {
    const { quotationRequired } = req.query;
    const vendorId = req.user.id;

    // 1️⃣ Fetch vendor location
    const vendor = await Vendor.findById(vendorId).select("location");

    // We must fetch vendor coordinates from the DB only (no URL fallback)
    if (!vendor) {
      return res
        .status(404)
        .json({ msg: "Vendor not found. Check your auth token." });
    }

    let lat = null;
    let lon = null;

    // Try multiple vendor location shapes used across the app (support backward compatibility)
    if (vendor.location) {
      // Diagnostic logs to inspect raw stored values
      console.debug("vendor.location raw:", vendor.location);
      try {
        console.debug("vendor.location keys:", Object.keys(vendor.location));
        console.debug("vendor.location types:", {
          latType: typeof vendor.location.latitude,
          lonType: typeof vendor.location.longitude,
          geoLatType: typeof vendor.location.GeoLocation?.latitude,
          geoLonType: typeof vendor.location.GeoLocation?.longitude,
        });
      } catch (e) {
        console.debug("vendor.location inspect error:", e.message);
      }

      const candidates = [];
      if (
        vendor.location?.type === "Point" &&
        Array.isArray(vendor.location.coordinates) &&
        vendor.location.coordinates.length === 2
      ) {
        const [lon, lat] = vendor.location.coordinates.map(Number);

        if (!isNaN(lat) && !isNaN(lon)) {
          candidates.push({
            parsedLat: lat,
            parsedLon: lon,
            source: "geojson",
          });
        }
      }

      // Top-level latitude/longitude (legacy) - attempt to read from raw DB doc if undefined on Mongoose doc
      let topLat = vendor.location.latitude;
      let topLon = vendor.location.longitude;
      if ((topLat === undefined || topLon === undefined) && vendor._id) {
        try {
          const raw = await Vendor.collection.findOne(
            { _id: vendor._id },
            { projection: { "location.latitude": 1, "location.longitude": 1 } },
          );
          if (raw && raw.location) {
            topLat = raw.location.latitude;
            topLon = raw.location.longitude;
            console.debug("vendor.location raw-from-db:", { topLat, topLon });
          }
        } catch (err) {
          console.warn(
            "Failed to fetch raw vendor.location from collection:",
            err.message,
          );
        }
      }

      if (topLat != null && topLon != null) {
        const parsedLat = Number(topLat);
        const parsedLon = Number(topLon);
        console.debug("vendor.location top-level parsed:", {
          parsedLat,
          parsedLon,
          rawLat: topLat,
          rawLon: topLon,
        });
        candidates.push({ parsedLat, parsedLon, source: "top" });
      }

      // GeoLocation shape
      if (
        vendor.location.GeoLocation &&
        vendor.location.GeoLocation.latitude != null &&
        vendor.location.GeoLocation.longitude != null
      ) {
        const parsedLat = Number(vendor.location.GeoLocation.latitude);
        const parsedLon = Number(vendor.location.GeoLocation.longitude);
        console.debug("vendor.location.GeoLocation parsed:", {
          parsedLat,
          parsedLon,
          rawLat: vendor.location.GeoLocation.latitude,
          rawLon: vendor.location.GeoLocation.longitude,
        });
        candidates.push({ parsedLat, parsedLon, source: "geo" });
      }

      // Choose candidate: prefer top-level non-zero coords, then geo non-zero, then any numeric
      console.debug("vendor.location candidates:", candidates);
      const preferOrder = ["top", "geo"];
      let chosen = null;
      for (const pref of preferOrder) {
        const c = candidates.find(
          (x) =>
            x.source === pref &&
            !isNaN(x.parsedLat) &&
            !isNaN(x.parsedLon) &&
            x.parsedLat !== 0 &&
            x.parsedLon !== 0,
        );
        if (c) {
          chosen = c;
          break;
        }
      }
      if (!chosen) {
        const c = candidates.find(
          (x) => !isNaN(x.parsedLat) && !isNaN(x.parsedLon),
        );
        if (c) chosen = c;
      }

      if (chosen) {
        lat = chosen.parsedLat;
        lon = chosen.parsedLon;
      } else {
        console.debug("No usable vendor.coords chosen from candidates");
      }
    }

    if (lat == null || lon == null) {
      return res.status(400).json({
        msg: "Vendor location not set. Please update your profile with valid latitude & longitude.",
      });
    }

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ msg: "Invalid vendor coordinates" });
    }

    // Max distance is defined below and used for geo queries

    // 2️⃣ Use $geoNear aggregation to get accurate distances for jobs with geo
    const match = {
      isActive: true,
      status: { $ne: "Expired" },
    };
    if (quotationRequired === "true") match.quotationRequired = true;
    if (quotationRequired === "false") match.quotationRequired = false;

    const MAX_DISTANCE = Number(req.query.maxDistance) || 20000;

    let jobs = [];

    try {
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lon, lat] }, // longitude, latitude
            distanceField: "distance",
            maxDistance: MAX_DISTANCE, // meters
            spherical: true,
            query: match,
          },
        },
        {
          $lookup: {
            from: "societies",
            localField: "society",
            foreignField: "_id",
            as: "society",
          },
        },
        { $unwind: { path: "$society", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: 1,
            type: 1,
            requiredExperience: 1,
            details: 1,
            contactNumber: 1,
            location: 1,
            offeredPrice: 1,
            quotationRequired: 1,
            scheduledFor: 1,
            status: 1,
            society: {
              _id: "$society._id",
              societyname: "$society.societyname",
              email: "$society.email",
              contact: "$society.contact",
              address: "$society.address",
              city: "$society.city",
              residentsCount: "$society.residentsCount",
            },
            distance: 1,
            createdAt: 1,
            completedAt: 1,
          },
        },
      ];

      jobs = await Job.aggregate(pipeline);
    } catch (err) {
      console.warn("getNearbyJobs $geoNear failed:", err.message);
      jobs = [];
    }

    // Diagnostic counts
    try {
      const geoCount = await Job.countDocuments({
        "geo.coordinates.0": { $exists: true },
      });
      const locCount = await Job.countDocuments({
        "location.latitude": { $exists: true },
      });
    } catch (err) {
      console.warn("getNearbyJobs diagnostic counts failed:", err.message);
    }

    // 3️⃣ Fallback: include jobs without geo (older docs) by computing haversine on location fields
    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = Math.PI / 180;
      const R = 6371000; // meters
      const dLat = (lat2 - lat1) * toRad;
      const dLon = (lon2 - lon1) * toRad;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * toRad) *
          Math.cos(lat2 * toRad) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Find candidate jobs that might not have geo field
    const degDelta = 0.2; // ~20km latitude delta
    const lonDelta = Math.abs(
      degDelta / Math.max(Math.cos((lat * Math.PI) / 180), 0.0001),
    );

    const bboxFilter = {
      "location.latitude": { $gte: lat - degDelta, $lte: lat + degDelta },
      "location.longitude": { $gte: lon - lonDelta, $lte: lon + lonDelta },
      isActive: true,
      status: { $ne: "Expired" },
    };
    if (quotationRequired === "true") bboxFilter.quotationRequired = true;
    if (quotationRequired === "false") bboxFilter.quotationRequired = false;

    const candidates = await Job.find(bboxFilter)
      .populate(
        "society",
        "societyname email contact address city residentsCount",
      )
      .lean();

    // Attach computed distance and filter within 20km
    const candidatesWithin = candidates
      .map((job) => {
        if (
          !job.location ||
          job.location.latitude == null ||
          job.location.longitude == null
        )
          return null;
        const d = haversine(
          lat,
          lon,
          Number(job.location.latitude),
          Number(job.location.longitude),
        );
        return { ...job, distance: d };
      })
      .filter((j) => j && j.distance <= MAX_DISTANCE);

    // Merge results and de-duplicate by _id, keeping smallest distance
    const mapById = new Map();

    jobs.forEach((j) => {
      mapById.set(String(j._id), j);
    });

    candidatesWithin.forEach((j) => {
      const key = String(j._id);
      if (
        !mapById.has(key) ||
        (mapById.get(key).distance ?? Infinity) > j.distance
      ) {
        mapById.set(key, j);
      }
    });

    jobs = Array.from(mapById.values()).sort(
      (a, b) => (a.distance || 0) - (b.distance || 0),
    );

    // Ensure final set respects MAX_DISTANCE
    jobs = jobs.filter((j) => (j.distance ?? Infinity) <= MAX_DISTANCE);

    if (!jobs.length) {
      return res.json([]);
    }

    const jobIds = jobs.map((job) => job._id);

    // 4 Vendor applications
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

    // 5️⃣ Format response
    const formattedJobs = jobs.map((job) => ({
      _id: job._id,
      title: job.title,
      type: job.type,
      requiredExperience: job.requiredExperience,
      details: job.details,
      contactNumber: job.contactNumber,
      location: job.location,
      offeredPrice: job.offeredPrice,
      quotationRequired: job.quotationRequired,
      scheduledFor: job.scheduledFor,
      status: job.status,

      // Distance (meters and km)
      distanceMeters: job.distance ?? null,
      distanceKm:
        job.distance != null ? Number((job.distance / 1000).toFixed(2)) : null,

      completedAt: job.completedAt
        ? new Date(job.completedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : null,

      applicationStatus: statusMap[job._id.toString()] || null,

      postedAt: new Date(job.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),

      society: job.society
        ? {
            _id: job.society._id,
            societyname: job.society.societyname,
            email: job.society.email,
            contact: job.society.contact,
            address: job.society.address,
            city: job.society.city,
            residentsCount: job.society.residentsCount,
          }
        : null,
    }));

    res.json(formattedJobs);
  } catch (err) {
    console.error("Error in getNearbyJobs:", err);
    res.status(500).json({
      msg: "Error fetching nearby jobs",
      error: err.message,
    });
  }
};

// Debug helper: query by lat/lon directly. Use for testing only (no auth). Optionally pass vendorId to include application status.
exports.getNearbyJobsDebug = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res
        .status(403)
        .json({ msg: "Debug endpoint disabled in production" });
    }

    const {
      lat: qlat,
      lon: qlon,
      latitude,
      longitude,
      maxDistance,
      quotationRequired,
      vendorId,
    } = req.query;
    const lat = Number(qlat ?? latitude);
    const lon = Number(qlon ?? longitude);
    const MAX_DISTANCE = Number(maxDistance) || 20000;

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return res
        .status(400)
        .json({ msg: "Provide numeric lat and lon query params" });
    }

    // Run geoNear agg
    const match = { isActive: true, status: { $ne: "Expired" } };
    if (quotationRequired === "true") match.quotationRequired = true;
    if (quotationRequired === "false") match.quotationRequired = false;

    let jobs = [];
    try {
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lon, lat] },
            distanceField: "distance",
            maxDistance: MAX_DISTANCE,
            spherical: true,
            query: match,
          },
        },
        {
          $lookup: {
            from: "societies",
            localField: "society",
            foreignField: "_id",
            as: "society",
          },
        },
        { $unwind: { path: "$society", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: 1,
            location: 1,
            distance: 1,
            society: 1,
            createdAt: 1,
            status: 1,
          },
        },
      ];
      jobs = await Job.aggregate(pipeline);
    } catch (err) {
      console.warn("Debug $geoNear failed:", err.message);
      jobs = [];
    }

    // Count docs with geo and location fields for diagnosis
    try {
      const geoCount = await Job.countDocuments({
        "geo.coordinates.0": { $exists: true },
      });
      const locCount = await Job.countDocuments({
        "location.latitude": { $exists: true },
      });
    } catch (err) {
      console.warn("Debug counts failed:", err.message);
    }

    // Fallback to bbox + haversine for docs without geo
    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = Math.PI / 180;
      const R = 6371000;
      const dLat = (lat2 - lat1) * toRad;
      const dLon = (lon2 - lon1) * toRad;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * toRad) *
          Math.cos(lat2 * toRad) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const degDelta = 0.3;
    const lonDelta = Math.abs(
      degDelta / Math.max(Math.cos((lat * Math.PI) / 180), 0.0001),
    );

    const bboxFilter = {
      "location.latitude": { $gte: lat - degDelta, $lte: lat + degDelta },
      "location.longitude": { $gte: lon - lonDelta, $lte: lon + lonDelta },
      isActive: true,
      status: { $ne: "Expired" },
    };

    const candidates = await Job.find(bboxFilter).lean();

    const candidatesWithin = candidates
      .map((job) => {
        if (
          !job.location ||
          job.location.latitude == null ||
          job.location.longitude == null
        )
          return null;
        const d = haversine(
          lat,
          lon,
          Number(job.location.latitude),
          Number(job.location.longitude),
        );
        return { ...job, distance: d };
      })
      .filter((j) => j && j.distance <= MAX_DISTANCE);

    // If both sources are empty, run an expanded $geoNear (no maxDistance limit) to see if any jobs are near at all
    if ((jobs.length === 0 || !jobs) && candidatesWithin.length === 0) {
      try {
        // Use $limit stage instead of limit param inside $geoNear
        const anyPipeline = [
          {
            $geoNear: {
              near: { type: "Point", coordinates: [lon, lat] },
              distanceField: "distance",
              spherical: true,
              query: { isActive: true },
            },
          },
          { $project: { _id: 1, distance: 1, location: 1, title: 1 } },
          { $limit: 5 },
        ];
        const anyNearby = await Job.aggregate(anyPipeline);
      } catch (err) {
        console.warn("Debug expanded $geoNear failed:", err.message);
      }

      // Show a few documents that actually have geo coordinates and compute distances both ways (in case coords are swapped)
      try {
        const geoDocs = await Job.find({
          "geo.coordinates.0": { $exists: true },
        })
          .limit(5)
          .lean();

        const haversine = (lat1, lon1, lat2, lon2) => {
          const toRad = Math.PI / 180;
          const R = 6371000;
          const dLat = (lat2 - lat1) * toRad;
          const dLon = (lon2 - lon1) * toRad;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * toRad) *
              Math.cos(lat2 * toRad) *
              Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        geoDocs.forEach((doc) => {
          const coords = doc.geo && doc.geo.coordinates;
          if (!coords || coords.length < 2) return;
          const docLon = Number(coords[0]);
          const docLat = Number(coords[1]);

          const distCorrect = haversine(lat, lon, docLat, docLon);
          const distSwapped = haversine(lat, lon, docLon, docLat);
        });
      } catch (err) {
        console.warn("Debug sample geo-docs failed:", err.message);
      }
    }

    // Merge
    const mapById = new Map();
    jobs.forEach((j) => mapById.set(String(j._id), j));
    candidatesWithin.forEach((j) => {
      const key = String(j._id);
      if (
        !mapById.has(key) ||
        (mapById.get(key).distance ?? Infinity) > j.distance
      )
        mapById.set(key, j);
    });

    const results = Array.from(mapById.values()).sort(
      (a, b) => (a.distance || 0) - (b.distance || 0),
    );

    // Optionally attach application status if vendorId provided
    if (vendorId && results.length) {
      const jobIds = results.map((r) => r._id);
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
      results.forEach(
        (r) => (r.applicationStatus = statusMap[String(r._id)] || null),
      );
    }

    res.json(
      results.map((r) => ({
        ...r,
        distanceKm: r.distance ? Number((r.distance / 1000).toFixed(2)) : null,
      })),
    );
  } catch (err) {
    console.error("Error in getNearbyJobsDebug:", err);
    res.status(500).json({ msg: "Debug error", error: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ msg: "Job not found" });
    await Job.deleteOne({ _id: id });
    res.json({ msg: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Error deleting job", error: err.message });
  }
};

// 3. Get Single Job by ID
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("society", "societyname email contact")
      .populate("selectedVendor", "name email contact");

    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    res.json(job);
  } catch (err) {
    console.error("Error fetching job:", err);
    res.status(500).json({
      msg: "Error fetching job",
      error: err.message,
    });
  }
};

// 4. Get All Jobs Posted by Society
exports.getMyPostedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ society: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(jobs);
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Error fetching posted jobs", error: err.message });
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
    res
      .status(500)
      .json({ msg: "Failed to expire old jobs", error: err.message });
  }
};

exports.getSocietyDetails = async (req, res) => {
  try {
    const societyId = req.user.id;
    const society = await Society.findById(societyId).select(
      "societyname email contact address city pincode residentsCount location isApproved createdAt updatedAt",
    );

    if (!society) return res.status(404).json({ msg: "Society not found" });

    const jobs = await Job.find({ society: societyId });

    const totalJobsPosted = jobs.filter((job) =>
      ["New", "Completed", "Expired"].includes(job.status),
    ).length;
    const activeJobsCount = jobs.filter(
      (job) => job.status === "Completed",
    ).length;

    const response = {
      id: society._id,
      name: society.societyname,
      email: society.email,
      contact: society.contact,
      address: society.address,
      city: society.city,
      pincode: society.pincode,
      residentsCount: society.residentsCount,
      location: society.location?.default ?? "Not provided",
      status: society.isApproved ? "Active" : "Pending",
      createdAt: society.createdAt,
      updatedAt: society.updatedAt,
    };

    res.json({ society: response });
  } catch (err) {
    console.error("Error in getSocietyOverview:", err);
    res.status(500).json({
      msg: "Failed to fetch society overview",
      error: err.message,
    });
  }
};

exports.getActiveSocientyJobs = async (req, res) => {
  try {
    const societyId = req.user.id;

    const activeJobs = await Job.find({
      society: societyId,
      status: "Completed",
    }).select(
      "title type requiredExperience details contactNumber location offeredPrice scheduledFor quotationRequired completedAt",
    );

    if (!activeJobs || activeJobs.length === 0) {
      return res
        .status(200)
        .json({ msg: "No active (completed) jobs found", activeJobs: [] });
    }

    const formattedJobs = activeJobs.map((job) => ({
      jobId: job._id,
      title: job.title,
      type: job.type,
      requiredExperience: job.requiredExperience,
      details: job.details,
      contactNumber: job.contactNumber,
      location: {
        latitude: job.location.latitude,
        longitude: job.location.longitude,
        googleMapLink: job.location.googleMapLink,
      },
      offeredPrice: job.offeredPrice,
      scheduledFor: job.scheduledFor,
      quotationRequired: job.quotationRequired,
      completedAt: job.completedAt,
    }));

    res.status(200).json({
      msg: "Active (Completed) jobs fetched successfully",
      totalActiveJobs: formattedJobs.length,
      activeJobs: formattedJobs,
    });
  } catch (err) {
    console.error("Error in getActiveJobs:", err);
    res.status(500).json({
      msg: "Failed to fetch active jobs",
      error: err.message,
    });
  }
};

// Society assigns vendor to job
exports.assignVendorToJob = async (req, res) => {
  try {
    console.log("=== ASSIGN VENDOR DEBUG ===");
    console.log("req.params:", req.params);
    console.log("req.body:", req.body);
    console.log("req.user:", req.user);

    const { jobId } = req.params;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({ msg: "vendorId is required" });
    }

    // 🔹 Find job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    // 🔹 Only job owner society can assign
    if (job.society.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    // 🔹 Find vendor application
    const application = await Application.findOne({
      job: jobId,
      vendor: vendorId,
    });

    if (!application) {
      return res
        .status(400)
        .json({ msg: "Vendor has not applied for this job" });
    }

    // 🔥 FIX: ensure society is present (THIS SOLVES YOUR ERROR)
    if (!application.society) {
      application.society = job.society;
    }

    // 🔹 Accept selected vendor
    application.status = "accepted";
    await application.save();

    // 🔹 Reject other vendors
    await Application.updateMany(
      { job: jobId, vendor: { $ne: vendorId } },
      { $set: { status: "rejected" } },
    );

    // 🔹 Assign vendor to job
    job.selectedVendor = vendorId;
    job.status = "In Progress";
    await job.save();

    // 🔹 Populate selected vendor for frontend
    const populatedJob = await Job.findById(jobId).populate("selectedVendor");

    return res.json({
      msg: "Vendor assigned successfully",
      job: populatedJob,
    });
  } catch (error) {
    console.error("Assign vendor error:", error);
    return res.status(500).json({
      msg: "Failed to assign vendor",
      error: error.message,
    });
  }
};

// Vendor applies to a job
exports.applyJob = async (req, res) => {
  try {
    if (req.user.role !== "vendor") {
      return res.status(403).json({ msg: "Only vendors can apply" });
    }

    const { jobId } = req.params;
    const vendorId = req.user.id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    // Prevent duplicate application
    const alreadyApplied = await Application.findOne({
      job: jobId,
      vendor: vendorId,
    });

    if (alreadyApplied) {
      return res.status(400).json({ msg: "Already applied to this job" });
    }

    // ✅ THIS IS THE MAIN FIX
    const application = new Application({
      job: jobId,
      vendor: vendorId,
      society: job.society, // 🔥 REQUIRED FIELD (ROOT FIX)
      status: "applied",
      applicationType: "normal",
    });

    await application.save();

    res.status(201).json({
      msg: "Applied successfully",
      application,
    });
  } catch (error) {
    console.error("Apply job error:", error);
    res.status(500).json({
      msg: "Failed to apply for job",
      error: error.message,
    });
  }
};
