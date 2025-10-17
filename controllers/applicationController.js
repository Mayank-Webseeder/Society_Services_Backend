const Application = require("../models/Application.js");
const Job = require("../models/Job");
const Vendor = require("../models/vendorSchema");

// 🔹 Vendor applies to job (quotation only)
exports.applyToJob = async (req, res) => {
	try {
		const { message, quotedpdf } = req.body;

		const jobId = req.params.id;

		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ msg: "Job not found" });

		// ✅ Prevent applying if job is already completed
		if (job.status === "Completed") {
			return res.status(400).json({ msg: "Cannot apply. This job is already completed." });
		}

		const existing = await Application.findOne({ job: jobId, vendor: req.user.id });
		if (existing) {
			return res.status(400).json({ msg: "Already applied or shown interest for this job" });
		}

		const application = new Application({
			job: jobId,
			vendor: req.user.id,
			applicationType: "quotation",
			message: message || "",
			quotedpdf,
			status: "approval pending",
			isQuotation: true,
		});

		await application.save();

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

		const existing = await Application.findOne({ job: jobId, vendor: req.user.id });
		if (existing) {
			return res.status(400).json({ msg: "Already applied or shown interest for this job" });
		}

		const application = new Application({
			job: jobId,
			vendor: req.user.id,
			applicationType: "interest",
			status: "approval pending",
			isQuotation: false,
			message: req.body?.message || "",
		});

		await application.save();

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

		const applications = await Application.find({ job: jobId })
			.populate("vendor", "name email phone")
			.select("applicationType status vendor");
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

		const application = await Application.findOne({ job: jobId, vendor: vendorId })
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

		const applications = await Application.find({ job: jobId });

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
