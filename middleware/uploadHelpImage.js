const fs = require("fs");
const path = require("path");

// Create uploads directory if it doesn't exist
const uploadsDirHelp = path.join(__dirname, "uploads/helpImages");
if (!fs.existsSync(uploadsDirHelp)) {
	fs.mkdirSync(uploadsDirHelp, { recursive: true });
}

const uploadHelpImage = (req, res, next) => {
	// Safely access req.body
	const helpImage = req.body?.helpImage;

	// If no helpImage, continue
	if (!helpImage) return next();

	// Handle already existing image path
	if (typeof helpImage.imageBase64 === "string" && helpImage.imageBase64.startsWith("/uploads/helpImages/")) {
		req.helpImageFile = {
			path: helpImage,
			mimeType: null,
			existing: true,
		};
		req.body.imageUrl = helpImage.imageBase64; // set for SupportRequest
		return next();
	}

	// Validate base64 and name
	if (!helpImage.imageBase64 || !helpImage.name) {
		return res.status(400).json({
			success: false,
			message: "Missing helpImage base64 or name",
		});
	}

	const { imageBase64, name } = helpImage;

	// Extract MIME type and base64 data
	const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
	if (!match) {
		return res.status(400).json({
			success: false,
			message: "Invalid base64 format",
		});
	}

	const mimeType = match[1]; // e.g., image/jpeg
	const base64Data = match[2];
	const extension = mimeType.split("/")[1];

	// Allow only JPEG, JPG, PNG
	if (!["jpeg", "jpg", "png"].includes(extension.toLowerCase())) {
		return res.status(400).json({
			success: false,
			message: "Only JPEG, PNG, JPG files are allowed",
		});
	}

	// Construct file name and path
	const fileName = `${Date.now()}-${name}.${extension}`;
	const filePath = path.join(uploadsDirHelp, fileName);
	console.log("Saving help image to:", filePath);

	fs.writeFile(filePath, base64Data, "base64", (err) => {
		if (err) {
			console.error("Error saving help image:", err);
			return res.status(500).json({
				success: false,
				message: "Failed to save help image",
			});
		}

		req.helpImageFile = {
			filename: fileName,
			path: `/uploads/helpImages/${fileName}`,
			fullPath: filePath,
			mimeType,
		};

		// Attach path for SupportRequest schema
		req.body.imageUrl = req.helpImageFile.path;

		next();
	});
};

module.exports = uploadHelpImage;
