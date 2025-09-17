const Subscription = require("../models/Subscription");

exports.checkActiveSubscription = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const subscription = await Subscription.findOne({
      vendor: vendorId,
      isActive: true
    });

    if (!subscription) {
      return res.status(403).json({
        message: "No active subscription found. Please subscribe to continue."
      });
    }

    const now = new Date();
    const isStillValid = now <= subscription.endDate;

    if (!isStillValid) {
      return res.status(403).json({
        message: "Your subscription has expired. Please renew to continue."
      });
    }

    // ✅ Valid subscription
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Subscription check failed",
      error: error.message
    });
  }
};
