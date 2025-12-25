const Society = require("../../models/SocietySchema.js");
const Job = require("../../models/Job.js");

// ✅ Approve Society
exports.approveSociety = async (req, res) => {
	try {
		const { societyId } = req.params;
		const society = await Society.findById(societyId);
		if (!society){
			return res.status(404).json({ msg: "Society not found" });
		}

		if (society.isApproved){
			return res.status(400).json({ msg: "Already approved" });
		}

		society.isApproved = true;
		await society.save();
		console.log("society approved")
		res.status(200).json({ msg: "Society approved" });
	} catch (err) {
		console.log(err);
		res.status(500).json({ msg: "Error approving society", error: err.message });
	}
};



exports.disapproveSociety = async (req, res) => {
	try {
		const { societyId } = req.params;
		const society = await Society.findById(societyId);
		if (!society){
			return res.status(404).json({ msg: "Society not found" });
		}

		if (!society.isApproved){
			return res.status(400).json({ msg: "Already disapproved" });
		}

		society.isApproved = false;
		await society.save();
		console.log("society disapproved")
		res.status(200).json({ msg: "Society approved" });
	} catch (err) {
		console.log(err);
		res.status(500).json({ msg: "Error approving society", error: err.message });
	}
};





exports.allSociety=async(req,res)=>{
	try {
		const data=await Society.find({},"societyname")
		res.status(200).json(data);
	} catch (error) {
		console.log(error);
		res.status(500).json({ msg: "error in geting data of society"});
		
	}
}


exports.numofSociety=async(req,res)=>{
	try {
		const data=await Society.countDocuments()
		res.status(200).json(data);
	} catch (error) {
		console.log(error);
		res.status(500).json({ msg: "error in geting data of society"});
		
	}
}


exports.getPendingSocieties = async (req, res) => {
	try {
		const pending = await Society.find({ isApproved: false },"buildingName");
		res.status(200).json({
			totalPendingSocieties: pending.length,
			pending});
	} catch (err) {
		console.log(err);
		res.status(500).json({ msg: "Error fetching pending" });
	}
};

// ✅ Get Approved Societies
exports.getApprovedSocieties = async (req, res) => {
	try {
		const approved = await Society.find({ isApproved: true });
		res.status(200).json({
			totalApprovedSocieties: approved.length,
			approved});
	} catch (err) {
		res.status(500).json({ msg: "Error fetching approved", error: err.message });
	}
};

exports.getAllSocietiesWithJobStats = async (req, res) => {
	try {
		const societies = await Society.find().select(
			"username buildingName email address profilePicture residentsCount location isApproved createdAt updatedAt"
		);

		const result = await Promise.all(
			societies.map(async (society) => {
				const totalJobsPosted = await Job.countDocuments({
					society: society._id,
					status: { $in: ["New", "Completed", "Expired"] },
				});

				const activeJobs = await Job.countDocuments({
					society: society._id,
					status: "Completed", // 'Active' means 'Completed' in your case
				});

				return {
					id: society._id,
					username: society.username,
					name: society.buildingName,
					email: society.email,
					address: society.address,
					location: society.location?.default ?? "N/A",
					residentsCount: society.residentsCount ?? 0,
					profilePicture: society.profilePicture,
					totalJobsPosted,
					activeJobs,
					status: society.isApproved ? "Active" : "Pending",
					createdAt: society.createdAt,
					updatedAt: society.updatedAt,
				};
			})
		);

		res.status(200).json({
			success: true,
			totalSocieties: result.length,
			societies: result,
		});
	} catch (error) {
		console.error("Error fetching societies with job stats:", error);
		res.status(500).json({
			success: false,
			message: "Failed to fetch societies data",
			error: error.message,
		});
	}
};

exports.deletesociety=async(req,res)=>{
	try {
		const { societyId } = req.params;
		const society = await Society.findByIdAndDelete(societyId);
		if (!society) {
			return res.status(404).json({ msg: "Society not found" });
		}
		res.status(200).json({ msg: "Society deleted successfully" });
	} catch (error) {
		console.log(error);
		res.status(500).json({ msg: "Error deleting society", error: error.message });
	}
};


exports.getSocietyDetailsById = async (req, res) => {
	try {
		const { societyId } = req.params;

		// Fetch society by ID
		const society = await Society.findById(societyId).select(
			"username buildingName email address profilePicture residentsCount location isApproved createdAt updatedAt"
		);

		if (!society) {
			return res.status(404).json({ success: false, msg: "Society not found" });
		}

		// Fetch all jobs for that society
		const jobs = await Job.find({ society: societyId }).select(
			"title type requiredExperience details offeredPrice scheduledFor status quotationRequired completedAt createdAt"
		);

		// Calculate stats
		const totalJobs = jobs.length;
		const activeJobs = jobs.filter((job) => job.status === "Completed").length;

		// Structure response
		res.status(200).json({
			success: true,
			society: {
				id: society._id,
				username: society.username,
				buildingName: society.buildingName,
				email: society.email,
				address: society.address,
				location: society.location,
				residentsCount: society.residentsCount,
				profilePicture: society.profilePicture,
				isApproved: society.isApproved,
				createdAt: society.createdAt,
				updatedAt: society.updatedAt,
				totalJobs,
				activeJobs,
			},
		});
	} catch (error) {
		console.error("Error fetching society details:", error);
		res.status(500).json({
			success: false,
			msg: "Failed to fetch society details",
			error: error.message,
		});
	}
};

exports.getAllJobsBySocietyId = async (req, res) => {
	try {
		const { societyId } = req.params;

		// Check if society exists
		const society = await Society.findById(societyId).select("username buildingName email");
		if (!society) {
			return res.status(404).json({ success: false, msg: "Society not found" });
		}

		// Fetch all jobs belonging to that society
		const jobs = await Job.find({ society: societyId })
			.select(
				"title type requiredExperience details contactNumber offeredPrice scheduledFor quotationRequired status isActive completedAt createdAt"
			)
			.sort({ createdAt: -1 }); // newest first

		// Respond
		res.status(200).json({
			success: true,
			society: {
				id: society._id,
				username: society.username,
				buildingName: society.buildingName,
				email: society.email,
			},
			totalJobs: jobs.length,
			jobs,
		});
	} catch (error) {
		console.error("Error fetching jobs for society:", error);
		res.status(500).json({
			success: false,
			msg: "Failed to fetch jobs for society",
			error: error.message,
		});
	}
};
