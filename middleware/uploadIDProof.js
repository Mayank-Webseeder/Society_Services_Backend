const fs = require("fs");
const path = require("path");

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const uploadIdProof = (req, res, next) => {
  // Safely access req.body
  const idProof = req.body?.idProof;

  // If idProof not present, continue to next middleware (no upload)
  if (!idProof) {
    return next();
  }

  // Validate presence of imageBase64 and name
  if (!idProof.imageBase64 || !idProof.name) {
    return res.status(400).json({
      success: false,
      message: "Missing idProof, base64 or name",
    });
  }

  const { imageBase64, name } = idProof;

  // Match and extract MIME type and base64 content
  const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid base64 format",
    });
  }

  const mimeType = match[1]; // e.g., image/jpeg
  const base64Data = match[2];
  const extension = mimeType.split("/")[1]; // e.g., jpeg, png

  const fileName = `${Date.now()}-${name}`;
  const filePath = path.join(uploadsDir, fileName);

  fs.writeFile(filePath, base64Data, "base64", (err) => {
    if (err) {
      console.error("Error saving image:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to save image",
      });
    }

    // Attach file info to request for later usage
    req.idProofFile = {
      filename: fileName,
      path: `/uploads/${fileName}`,
      fullPath: filePath,
      mimeType,
    };

    next();
  });
};

module.exports = uploadIdProof;
