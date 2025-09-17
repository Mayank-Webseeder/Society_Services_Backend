  const mongoose = require("mongoose");

  const societySchema = new mongoose.Schema(
    {
      username: {
  type: String,
  required: true,
  unique: true,
},
      profilePicture: { type: String, default: "AWSSocietyLogoDefualt.jpg" },

      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      buildingName: { type: String, required: true },
      address: { type: String, required: true },
      jobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
      residentsCount: { type: Number, default: 0 },
      location: {
        lonngitude: { type: Number },
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
}
    },
    { timestamps: true }
  );

  module.exports = mongoose.model("Society", societySchema);
