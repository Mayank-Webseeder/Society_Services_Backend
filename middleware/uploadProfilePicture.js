const fs = require("fs");
const path = require("path");

const uploadsDirProfilePic = path.join(__dirname, "uploads/profilePictures");
if (!fs.existsSync(uploadsDirProfilePic)) {
	fs.mkdirSync(uploadsDirProfilePic, { recursive: true });
}

const uploadProfilePicture = (req, res, next) => {
	// Safely access req.body                                              will be used later
	const profilePic = req.body?.profilePic;

	// If profilePic not present, continue to next middleware
	if (!profilePic) return next();
	if (typeof profilePic.imageBase64 === "string" && profilePic.imageBase64.startsWith("/uploads/profilePicture/")) {
		req.profilePicFile = {
			path: profilePic,
			mimeType: null,
			existing: true,
		};
	}
	// Validate presence of fileBase64 and name
	if (!profilePic.imageBase64 || !profilePic.name) {
		return res.status(400).json({
			success: false,
			message: "Missing profilePic, base64 or name",
		});
	}

	const { imageBase64, name } = profilePic;

	// Match and extract MIME type and base64 content
	const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
	if (!match) {
		return res.status(400).json({
			success: false,
			message: "Invalid base64 format",
		});
	}

	const mimeType = match[1]; // e.g., image/jpeg or application/pdf
	const base64Data = match[2];
	const extension = mimeType.split("/")[1]; // e.g., jpeg, png, pdf

	// ✅ Allow only JPEG, JPG, PNG, and PDF
	if (!["jpeg", "jpg", "png"].includes(extension.toLowerCase())) {
		return res.status(400).json({
			success: false,
			message: "Only JPEG, PNG , jpg files are allowed",
		});
	}

	// Construct file name and path
	// const baseName = path.parse(name).name;
	const fileName = `${Date.now()}-${name}.${extension}`;
	const filePath = path.join(uploadsDirProfilePic, fileName);
	console.log("Saving profile picture to:", filePath);


fs.writeFile(filePath, base64Data, "base64", (err) => {
    if (err) {
        console.error("Error saving profile picture:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to save profile picture",
        });
    }

    req.profilePicFile = {
        filename: fileName,
        path: `/uploads/profilePictures/${fileName}`,
        fullPath: filePath,
        mimeType,
    };

 req.body.profilePicture = req.profilePicFile.path;


		next();
	});
};

module.exports = uploadProfilePicture;
