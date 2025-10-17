const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
	society: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Society",
		required: true,
	},
	title: {
		type: String,
		required: true,
		trim: true,
	},
	type: {
		type: String,
		required: true,
	},
	requiredExperience: {
		type: String,
		required: true,
	},
	details: {
		type: String,
		required: true,
	},
	contactNumber: {
		type: String,
		required: true,
		match: /^[0-9]{10}$/,
	},
	location: {
		latitude: { type: Number, required: true },
		longitude: { type: Number, required: true },
		googleMapLink: { type: String },
	},
	geo: {
		type: {
			type: String,
			enum: ["Point"],
			default: "Point",
		},
		coordinates: {
			type: [Number],
			required: true,
		},
	},
	offeredPrice: {
		type: Number,
		required: true,
	},
	scheduledFor: {
		type: Date,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	quotationRequired: {
		type: Boolean,
		default: false,
		required: true,
	},
	isActive: {
		type: Boolean,
		default: true,
	},
	status: {
		type: String,
		enum: ["New", "Completed", "Expired"],
		default: "New",
	},
	// 🆕 Field to store when job is completed
	completedAt: {
		type: Date,
		default: null,
	},
});

jobSchema.index({ geo: "2dsphere" });

// 🪝 Pre-save hook to set completedAt time
jobSchema.pre("save", function (next) {
	if (this.isModified("status") && this.status === "Completed") {
		this.completedAt = new Date();
	}
	next();
});

module.exports = mongoose.model("Job", jobSchema);
