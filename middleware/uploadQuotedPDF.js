const cloudinary = require("../controllers/vendor/cloudinary");

module.exports = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "quotation",
        resource_type: "raw",
        allowed_formats: ["pdf"],
      }
    );

    req.body.quotedpdf = result.secure_url;
    req.body.quotedpdf_public_id = result.public_id;

    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

