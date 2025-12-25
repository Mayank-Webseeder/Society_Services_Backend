const express = require("express");
const router = express.Router();

const {
  createService,
  getServicesWithCategories,
} = require("../../controllers/admin/serviceController");

// CREATE SERVICE
router.post("/", createService);

// GET SERVICES WITH CATEGORIES
router.get("/with-categories", getServicesWithCategories);

module.exports = router;
