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
	// console.log("heelllooo");
	//  console.log(req.body.message);
	try {
		const jobId = req.params.id;

		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ msg: "Job not found" });

		const existing = await Application.findOne({ job: jobId, vendor: req.user.id });
		if (existing) {
			return res.status(400).json({ msg: "Already applied or shown interest for this job" });
		}
		// console.log(req.body);
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

		if (application.job.society.toString() !== req.user.id) {
			return res.status(403).json({ msg: "Unauthorized" });
		}

		application.status = "approved";
		await application.save();

		const job = await Job.findById(application.job._id);
		job.status = "Ongoing";
		await job.save();

		res.json({ msg: "Application approved. Job is now Ongoing", application });
	} catch (err) {
		res.status(500).json({ msg: "Error approving application", error: err.message });
	}
};

// ✅ Mark job as completed
exports.markJobComplete = async (req, res) => {
	try {
		const { jobId } = req.params;

		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ msg: "Job not found" });

		if (job.society.toString() !== req.user.id) {
			return res.status(403).json({ msg: "Unauthorized" });
		}

		job.status = "Completed";
		await job.save();
		await Application.updateMany({ job: jobId, status: "approved" }, { $set: { status: "completed" } });
		res.json({ msg: "Job marked as Completed" });
	} catch (err) {
		res.status(500).json({ msg: "Error updating job", error: err.message });
	}
};

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

		if (application.job.society.toString() !== req.user.id) {
			return res.status(403).json({ msg: "Unauthorized" });
		}

		application.status = "rejected";
		await application.save();

		res.json({ msg: "Application rejected", application });
	} catch (err) {
		res.status(500).json({ msg: "Error rejecting application", error: err.message });
	}
};
exports.withdrawApplication = async (req, res) => {
	try {
		const vendorId = req.user.id; // ✅ from your auth middleware
		const { applicationId } = req.params; // ✅ pass ID in route /withdraw/:applicationId

		// 1️⃣ Find the application
		const application = await Application.findById(applicationId);

		if (!application) {
			return res.status(404).json({ msg: "Application not found" });
		}

		// 2️⃣ Ensure the vendor owns this application
		if (application.vendor.toString() !== vendorId) {
			return res.status(403).json({ msg: "You are not authorized to withdraw this application." });
		}

		// 3️⃣ Prevent withdrawing already withdrawn or processed applications
		if (["withdrawn", "rejected", "approved"].includes(application.status)) {
			return res.status(400).json({
				msg: `Cannot withdraw. This application is already ${application.status}.`,
			});
		}

		const wasApproved = application.status === "approved"; // ✅ key check

		application.status = "withdrawn";
		await application.save();

		// 2. Only if the withdrawn application was approved
		if (wasApproved) {
			// Revert job status to New
			const job = await Job.findById(application.job);
			job.status = "New";
			await job.save();

			// Reset all previously rejected applications to approval pending
			await Application.updateMany({ job: job._id, status: "rejected" }, { status: "approval pending" });
		}

		// (Optional) — revert job status if needed
		const job = await Job.findById(application.job);

		if (job && (job.status === "Ongoing" || job.status === "New")) {
			const remainingApps = await Application.find({
				job: job._id,
				status: { $nin: ["withdrawn", "rejected"] }, // only active ones
			});

			if (remainingApps.length === 0) {
				job.status = "New"; // No active or approved applications left
				await job.save();
			}
		}

		return res.status(200).json({ msg: "Application withdrawn successfully." });
	} catch (err) {
		console.error("Error withdrawing application:", err);
		res.status(500).json({ msg: "Server error", error: err.message });
	}
};
