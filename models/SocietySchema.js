const mongoose = require("mongoose");

const societySchema = new mongoose.Schema(
	{
		societyname: {
			type: String,
			required: true,
			unique: true,
		},
		contact: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		address: { type: String, required: true },
		city: { type: String, required: true },
		pincode: { type: String, required: true },
		residentsCount: { type: Number, default: 0 },
		location: {
			longitude: { type: Number },
			latitude: { type: Number },
			default: { type: String, default: "Not provided" },
			googleMapLink: { type: String, default: "Not provided" },
		},
		role: {
			type: String,
			default: "society",
			immutable: true,
		},
		isApproved: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.models.Society || mongoose.model("Society", societySchema);
