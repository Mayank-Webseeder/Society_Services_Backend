const express = require("express");
const router = express.Router();

const {
  addOrUpdateVendorService,
  getVendorServices,
} = require("../../controllers/vendor/vendorServiceController");

// ✅ IMPORT MIDDLEWARE (NOT CONTROLLER)
const vendorAuth = require("../../middleware/vendorAuth");

router.post("/add", vendorAuth, addOrUpdateVendorService);
router.get("/", vendorAuth, getVendorServices);

module.exports = router;
