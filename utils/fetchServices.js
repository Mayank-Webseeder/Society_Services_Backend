const Services = require("../models/Services");

let cachedServices = [];

// 🔄 Function to refresh the cache
async function refreshServices() {
  try {
    const services = await Services.find({ isActive: true }).select("name -_id");
    cachedServices = services.map((s) => s.name);
    console.log("✅ Services refreshed:", cachedServices);
  } catch (err) {
    console.error("❌ Failed to load services:", err.message);
  }
}

// 🧠 Getter to access the current cached list
function getServices() {
  return cachedServices;
}

// Optionally auto-refresh on startup
// refreshServices();

// Export both
module.exports = {
  refreshServices,
  getServices,
};
