const Society = require("../../models/SocietySchema");
const Job = require("../../models/Job");
const Application = require("../../models/Application");
const Feedback = require("../../models/FeedbackSchema");
const Vendor = require("../../models/vendorSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signupSociety = async (req, res) => {
  try {
    const { username, email, password, buildingName, address, residentsCount } =
      req.body;

    // 🔐 Check if email already exists
    const existing = await Society.findOne({ email });
    if (existing)
      return res.status(400).json({ msg: "Society already exists" });

    // 🔐 Check if username already exists
    const existingUsername = await Society.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ msg: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newSociety = new Society({
      username,
      email,
      password: hashed,
      buildingName,
      address,
      residentsCount,
    });
    console.log("Saving Society:", newSociety);
    await newSociety.save();

    const token = jwt.sign(
      { id: newSociety._id, role: newSociety.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res
      .status(201)
      .json({ msg: "Society registered successfully", authToken: token });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.loginSociety = async (req, res) => {
  try {
    const { email, password } = req.body;
    const society = await Society.findOne({ email });
    if (!society) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, society.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign(
      { id: society._id, role: society.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token, role: society.role });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.giveRating = async (req, res) => {
  try {
    const societyId = req.user.id;          // Society from auth
    const { jobId } = req.params;
    const { rating, feedbackText } = req.body;

    // 1️⃣ Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 1 and 5." });
    }

    // 2️⃣ Check job exists and is completed
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ msg: "Job not found." });
    if (job.status !== "Completed") {
      return res.status(400).json({ msg: "Only completed jobs can be rated." });
    }

    // 3️⃣ Find assigned vendor via approved application
    const application = await Application.findOne({
      job: jobId,
      status: "approved",
    });

    if (!application) {
      return res.status(400).json({ msg: "No vendor assigned for this job." });
    }

    const vendorId = application.vendor;

    // 4️⃣ Prevent duplicate feedback
    const existingFeedback = await Feedback.findOne({
      job: jobId,
      society: societyId,
    });
    if (existingFeedback) {
      return res.status(400).json({ msg: "You have already rated this job." });
    }

    // 5️⃣ Save feedback
    const feedback = await Feedback.create({
      vendor: vendorId,
      job: jobId,
      society: societyId,
      rating,
      feedbackText: feedbackText || "",
    });

    // 6️⃣ Update vendor average rating
    const allFeedbacks = await Feedback.find({ vendor: vendorId });
    const avgRating =
      allFeedbacks.reduce((sum, f) => sum + f.rating, 0) / allFeedbacks.length;

    await Vendor.findByIdAndUpdate(vendorId, {
      averageRating: avgRating.toFixed(1),
      totalRatings: allFeedbacks.length,
    });

    res.status(201).json({
      msg: "Rating submitted successfully",
      feedback,
      updatedVendorRating: avgRating.toFixed(1),
    });
  } catch (err) {
    console.error("Error in giveRating:", err);
    res.status(500).json({ msg: "Failed to submit rating", error: err.message });
  }
};