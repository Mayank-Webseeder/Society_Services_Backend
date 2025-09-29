const fs = require("fs");
const path = require("path");

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads/idProof");
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

  // Validate presence of fileBase64 and name
  if (!idProof.fileBase64 || !idProof.name) {
    return res.status(400).json({
      success: false,
      message: "Missing idProof, base64 or name",
    });
  }

  const { fileBase64, name } = idProof;

  // Match and extract MIME type and base64 content
  const match = fileBase64.match(/^data:(.+);base64,(.+)$/);
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
      path: `/uploads/idProof/${fileName}`,
      fullPath: filePath,
      mimeType,
    };

    next();
  });
};

module.exports = uploadIdProof;
// const uploadsDirProfilePic = path.join(__dirname, "uploads/profilePictures");
// if (!fs.existsSync(uploadsDirProfilePic )) {
//   fs.mkdirSync(uploadsDirProfilePic , { recursive: true });
// }

// const uploadProfilePicture = (req, res, next) => {
//   // Safely access req.body                                              will be used later
//   const profilePic = req.body?.profilePic;

//   // If profilePic not present, continue to next middleware
//   if (!profilePic) return next();

//   // Validate presence of fileBase64 and name
//   if (!profilePic.fileBase64 || !profilePic.name) {
//     return res.status(400).json({
//       success: false,
//       message: "Missing profilePic, base64 or name",
//     });
//   }

//   const { imageBase64, name } = profilePic;

//   // Match and extract MIME type and base64 content
//   const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
//   if (!match) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid base64 format",
//     });
//   }

//   const mimeType = match[1]; // e.g., image/jpeg
//   const base64Data = match[2];
//   const extension = mimeType.split("/")[1]; // e.g., jpeg, png

//   // Optional: enforce image types only
//   if (!["jpeg", "jpg", "png"].includes(extension.toLowerCase())) {
//     return res.status(400).json({
//       success: false,
//       message: "Only JPEG or PNG images are allowed",
//     });
//   }

//   const fileName = `${Date.now()}-${name}`;
//   const filePath = path.join(uploadsDir, fileName);

//   fs.writeFile(filePath, base64Data, "base64", (err) => {
//     if (err) {
//       console.error("Error saving profile picture:", err);
//       return res.status(500).json({
//         success: false,
//         message: "Failed to save profile picture",
//       });
//     }

//     // Attach file info to request for later usage
//     req.profilePicFile = {
//       filename: fileName,
//       path: `/uploads/profilePictures/${fileName}`,
//       fullPath: filePath,
//       mimeType,
//     };

//     next();
//   });
// };

// module.exports = uploadProfilePicture;