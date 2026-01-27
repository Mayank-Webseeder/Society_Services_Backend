const cloudinary = require("../controllers/vendor/cloudinary");

// Middleware: upload ID proof to Cloudinary and attach result to req
module.exports = async (req, res, next) => {
  try {
    // If no file was uploaded, just continue
    if (!req.file) return next();

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "vendor-idproofs",
      }
    );

    // Attach cloudinary result to request for later handlers
    req.idProofFile = {
      url: result.secure_url,
      public_id: result.public_id,
    };

    // Continue to the next middleware / controller
    next();
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
