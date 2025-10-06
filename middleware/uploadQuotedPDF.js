const fs = require("fs");
const path = require("path");

// Ensure uploads folder exists
const uploadsDirQuotation = path.join(__dirname, "uploads/quotations");
if (!fs.existsSync(uploadsDirQuotation)) {
	fs.mkdirSync(uploadsDirQuotation, { recursive: true });
}

const uploadQuotedPdf = (req, res, next) => {
	const quotedPdf = req.body?.quotedpdf;

	// If no PDF data provided, move on
	if (!quotedPdf) return next();

	// Handle already uploaded file path case
	if (typeof quotedPdf.fileBase64 === "string" && quotedPdf.fileBase64.startsWith("/uploads/quotations/")) {
		req.quotedPdfFile = {
			path: quotedPdf,
			mimeType: null,
			existing: true,
		};
		return next();
	}

	// Validate presence of base64 and name
	if (!quotedPdf.fileBase64 || !quotedPdf.name) {
		return res.status(400).json({
			success: false,
			message: "Missing quotedpdf fileBase64 or name",
		});
	}

	const { fileBase64, name } = quotedPdf;

	// Match and extract MIME type and base64 content
	const match = fileBase64.match(/^data:(.+);base64,(.+)$/);
	if (!match) {
		return res.status(400).json({
			success: false,
			message: "Invalid base64 format",
		});
	}

	const mimeType = match[1]; // e.g. "application/pdf"
	const base64Data = match[2];
	const extension = mimeType.split("/")[1]; // e.g. "pdf"

	// Allow only PDFs
	if (extension.toLowerCase() !== "pdf") {
		return res.status(400).json({
			success: false,
			message: "Only PDF files are allowed",
		});
	}

	// Create a unique file name
	const baseName = path.parse(name).name; // removes any existing extension
	const fileName = `${Date.now()}-${baseName}.${extension}`;
	const filePath = path.join(uploadsDirQuotation, fileName);

	// Save the file
	fs.writeFile(filePath, base64Data, "base64", (err) => {
		if (err) {
			console.error("Error saving PDF:", err);
			return res.status(500).json({
				success: false,
				message: "Failed to save PDF",
			});
		}

		// Attach file info to req for further usage
		req.quotedPdfFile = {
			filename: fileName,
			path: `/uploads/quotations/${fileName}`,
			fullPath: filePath,
			mimeType,
		};

		// Store path in body
		req.body.quotedpdf = req.quotedPdfFile.path;

		next();
	});
};

module.exports = uploadQuotedPdf;
