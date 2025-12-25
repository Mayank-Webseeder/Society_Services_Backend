const express = require("express");
const router = express.Router();
const {
  addCategory,
} = require("../../controllers/admin/serviceCategoryController");

router.post("/add", addCategory);

module.exports = router;
