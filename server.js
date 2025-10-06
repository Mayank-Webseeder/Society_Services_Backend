const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const societyRoutes = require("./routes/societyRoutes");
const swaggerSpec = require("./swaggerOptions");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;

// ✅ CORS Configuration
const allowedOrigins = [
	"http://localhost:5173",
	"http://localhost:5174",
	"https://social-services-app.vercel.app",
	"https://delightful-pastelito-988e6f.netlify.app",
	"https://admin.mysocietyneeds.com",
	"https://admin-society.webseeder.tech",
];

app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
		allowedHeaders: ["Content-Type", "Authorization", "authToken"],
	})
);

// ✅ Body Parsing Middleware
app.use(express.json({ limit: "10mb" })); // For base64-encoded images
app.use(express.urlencoded({ extended: true })); // Handles form-urlencoded if needed

app.use("/uploads/idProof", express.static(path.join(__dirname, "middleware/uploads/idProof")));

// Serve profile picture files
app.use("/uploads/profilePictures", express.static(path.join(__dirname, "middleware/uploads/profilePictures")));
// ✅ Swagger API docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/uploads/idProof", (req, res, next) => {
  // Force browser to open instead of downloading
  res.setHeader("Content-Disposition", "inline");
  next();
});
// ✅ Root Health Check
app.get("/", (req, res) => {
	res.send("Welcome to Velnor API");
});

// ✅ Routes
app.use("/api/admin", adminRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/society", societyRoutes);
app.use("/api/jobs", jobRoutes); // e.g. POST /api/jobs/create, GET /api/jobs/nearby
app.use("/api/applications", applicationRoutes); // e.g. POST /api/applications/:id/apply

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
	.then(() => {
		console.log("✅ MongoDB connected");
		app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
	})
	.catch((err) => {
		console.error("❌ MongoDB connection error:", err);
	});
