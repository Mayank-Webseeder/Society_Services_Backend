const Application = require("../models/Application.js");
const Job = require("../models/Job");
const Vendor = require("../models/vendorSchema");
const Subscription = require("../models/Subscription");
const mongoose = require("mongoose");

// 🔹 Vendor applies to job (quotation only)
exports.applyToJob = async (req, res) => {
	try {
		const { message, quotedpdf } = req.body;

		const jobId = req.params.id;

		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ msg: "Job not found" });


		//subscription vala bad ma add kar dena
		//const subscription = await Subscription.findOne({ vendor: req.user.id, isActive: true });
		// if (!subscription) {
		// 	return res.status(403).json({ msg: "Active subscription required to apply for jobs." });
		// }
		// ✅ Prevent applying if job is already completed
		if (job.status === "Completed") {
			return res.status(400).json({ msg: "Cannot apply. This job is already completed." });
		}

		const existing = await Application.findOne({ job: job._id, vendor: req.user.id });
		if (existing) {
			return res.status(400).json({ msg: "Already applied or shown interest for this job" });
		}

		const application = new Application({
			job: job._id,
			vendor: req.user.id,
			applicationType: "quotation",
			message: message || "",
			quotedpdf,
			status: "approval pending",
			isQuotation: true,
		});

		await application.save();
		if (process.env.NODE_ENV !== "production") console.log("Saved application:", application);

		res.status(201).json({ msg: "Applied with quotation", application });
	} catch (err) {
		res.status(500).json({ msg: "Failed to apply", error: err.message });
	}
};

// 🔹 Vendor shows interest (button click, no quotation)
exports.showInterestInJob = async (req, res) => {
	try {
		const jobId = req.params.id;

		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ msg: "Job not found" });

		// ✅ Prevent showing interest if job is completed
		if (job.status === "Completed") {
			return res.status(400).json({ msg: "Cannot show interest. This job is already completed." });
		}

		const existing = await Application.findOne({ job: job._id, vendor: req.user.id });
		if (existing) {
			return res.status(400).json({ msg: "Already applied or shown interest for this job" });
		}

		const application = new Application({
			job: job._id,
			vendor: req.user.id,
			applicationType: "interest",
			status: "approval pending",
			isQuotation: false,
			message: req.body?.message || "",
		});

		await application.save();
		if (process.env.NODE_ENV !== "production") console.log("Saved application:", application);

		res.status(201).json({ msg: "Interest shown successfully", application });
	} catch (err) {
		res.status(500).json({ msg: "Failed to show interest", error: err.message });
	}
};

// 🔹 Society views all applicants
exports.getJobApplicants = async (req, res) => {
	try {
		const jobId = req.params.id;

		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ msg: "Job not found" });

		if (job.society.toString() !== req.user.id) {
			return res.status(403).json({ msg: "Unauthorized" });
		}
		// Validate jobId and ensure we query with an ObjectId
		if (!mongoose.Types.ObjectId.isValid(jobId)) {
			return res.status(400).json({ msg: "Invalid job id" });
		}
		const jobObjectId = new mongoose.Types.ObjectId(jobId);

		const applications = await Application.find({ job: jobObjectId })
			.populate("vendor", "name email phone")
			.select("applicationType status vendor");

		// Dev-only debug: if none found, log a sample of existing application docs to help diagnose schema mismatches
		if (applications.length === 0 && process.env.NODE_ENV !== "production") {
			console.warn(`[debug] No applications found for job ${jobId}`);
			const sample = await Application.find().limit(5).select("job vendor status applicationType");
			console.warn(sample);
		}
		const result = applications.map((app) => ({
			applicationId: app._id,
			name: app.vendor.name,
			email: app.vendor.email,
			phone: app.vendor.phone,
			applicationType: app.applicationType,
			status: app.status,
		}));

		res.json({ applicants: result });
	} catch (err) {
		res.status(500).json({ msg: "Failed to get applicants", error: err.message });
	}
};

// ===== DEV HELPERS =====
// Dev-only: Raw list of applications for a given job id (bypasses society ownership check)
exports.debugListApplicationsForJob = async (req, res) => {
	if (process.env.NODE_ENV === "production") return res.status(403).json({ msg: "Disabled in production" });
	try {
		const { jobId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(jobId)) return res.status(400).json({ msg: "Invalid job id" });
		const apps = await Application.find({ job: new mongoose.Types.ObjectId(jobId) }).select("job vendor applicationType status createdAt");
		return res.json({ count: apps.length, apps });
	} catch (err) {
		return res.status(500).json({ msg: "Error fetching debug data", error: err.message });
	}
};

// Dev-only: list orphaned applications (applications with no corresponding job)
exports.debugListOrphanApplications = async (req, res) => {
	if (process.env.NODE_ENV === "production") return res.status(403).json({ msg: "Disabled in production" });
	try {
		// Find all distinct job ids referenced in applications
		const distinctJobIds = await Application.distinct("job");
		// Find which job ids do not exist in jobs collection
		const existingJobs = await Job.find({ _id: { $in: distinctJobIds } }).select("_id");
		const existingSet = new Set(existingJobs.map((j) => j._id.toString()));
		const orphanIds = distinctJobIds.filter((id) => !existingSet.has(id.toString()));

		const orphans = await Application.find({ job: { $in: orphanIds } }).select("job vendor applicationType status createdAt");
		return res.json({ orphanCount: orphans.length, orphanIds, orphans });
	} catch (err) {
		return res.status(500).json({ msg: "Error fetching orphaned applications", error: err.message });
	}
};

// ✅ Approve a vendor application
exports.approveApplication = async (req, res) => {
	try {
		const { applicationId } = req.params;

		const application = await Application.findById(applicationId).populate("job");
		if (!application) return res.status(404).json({ msg: "Application not found" });

		// ✅ Society ownership check
		if (application.job.society.toString() !== req.user.id) {
			return res.status(403).json({ msg: "Unauthorized" });
		}

		// ✅ Approve current application
		application.status = "approved";

		await application.save();

		// ✅ Reject all other applications for the same job
		await Application.updateMany({ job: application.job._id, _id: { $ne: application._id } }, { $set: { status: "rejected" } });

		// ✅ Update job status to complete
		const job = await Job.findById(application.job._id);
		job.status = "Completed";
		job.completedAt = new Date();
		await job.save();
		await Vendor.findByIdAndUpdate(application.vendor, {
			$addToSet: { jobHistory: job._id }, // avoids duplicates
		});
		await application.populate("job");
		res.json({ msg: "Application approved. Job is now Complete", application });
	} catch (err) {
		res.status(500).json({ msg: "Error approving application", error: err.message });
	}
};

// ✅ Mark job as completed now not in use
// exports.markJobComplete = async (req, res) => {
// 	try {
// 		const { jobId } = req.params;

// 		const job = await Job.findById(jobId);
// 		if (!job) return res.status(404).json({ msg: "Job not found" });

// 		if (job.society.toString() !== req.user.id) {
// 			return res.status(403).json({ msg: "Unauthorized" });
// 		}

// 		job.status = "Completed";
// 		await job.save();
// 		await Application.updateMany({ job: jobId, status: "approved" }, { $set: { status: "completed" } });
// 		res.json({ msg: "Job marked as Completed" });
// 	} catch (err) {
// 		res.status(500).json({ msg: "Error updating job", error: err.message });
// 	}
// };

// 🔹 Get vendor application type (quotation or interest)
exports.getVendorApplicationType = async (req, res) => {
	try {
		const { jobId, vendorId } = req.params;

		if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(vendorId)) {
			return res.status(400).json({ msg: "Invalid jobId or vendorId" });
		}
		const application = await Application.findOne({ job: new mongoose.Types.ObjectId(jobId), vendor: new mongoose.Types.ObjectId(vendorId) })
			.populate("vendor", "name email phone")
			.select("applicationType");

		if (!application) {
			return res.status(404).json({ msg: "No application or interest found for this vendor" });
		}

		res.json({
			name: application.vendor.name,
			email: application.vendor.email,
			phone: application.vendor.phone,
			applicationType: application.applicationType,
		});
	} catch (err) {
		res.status(500).json({ msg: "Failed to fetch vendor application type", error: err.message });
	}
};

// ✅ Society → Get Applicant Count Per Job
exports.getApplicantCount = async (req, res) => {
	try {
		const { jobId } = req.params;

		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ msg: "Job not found" });

		if (job.society.toString() !== req.user.id) {
			return res.status(403).json({ msg: "Unauthorized" });
		}

		const applications = await Application.find({ job: job._id });

		const totalApplicants = applications.length;
		const quotationApplications = applications.filter((a) => a.isQuotation).length;
		const interestApplications = totalApplicants - quotationApplications;

		res.json({
			jobId,
			totalApplicants,
			quotationApplications,
			interestApplications,
		});
	} catch (err) {
		res.status(500).json({ msg: "Error fetching applicant count", error: err.message });
	}
};
// ✅ Society → Reject Vendor Application
exports.rejectApplication = async (req, res) => {
	try {
		const { applicationId } = req.params;

		const application = await Application.findById(applicationId).populate("job");
		if (!application) return res.status(404).json({ msg: "Application not found" });

		// ✅ Society ownership check
		if (application.job.society.toString() !== req.user.id) {
			return res.status(403).json({ msg: "Unauthorized" });
		}

		// ✅ Prevent rejection after job is completed
		if (application.job.status !== "New") {
			return res.status(400).json({ msg: "Cannot reject applications after job is completed." });
		}

		// ✅ Mark as rejected
		application.status = "rejected";
		await application.save();

		// ✅ (Optional) No need to reset job to "New"
		// We only mark job "Completed" when one is approved.
		// Removing this avoids accidental reopen of completed jobs.

		res.json({ msg: "Application rejected successfully", application });
	} catch (err) {
		res.status(500).json({ msg: "Error rejecting application", error: err.message });
	}
};
