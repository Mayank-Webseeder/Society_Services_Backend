const Subscription = require("../../models/Subscription");
const Vendor = require("../../models/vendorSchema");
const { sendSubscriptionEmail } = require("../../utils/notify");

// ✅ Vendor: Purchase Subscription (Simulated Payment Flow with Dynamic Price)
exports.purchaseSubscription = async (req, res) => {
  const vendorId = req.user.id;
  const basePrice = 999;

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  try {
    const vendor = await Vendor.findById(vendorId);

    if (!vendor || !vendor.services || vendor.services.length === 0) {
      return res.status(400).json({
        message: "Vendor not found or no services selected. Please update your profile first.",
      });
    }

    const numberOfServices = vendor.services.length;
    const totalPrice = basePrice * numberOfServices;

    // Mark all previous subscriptions as inactive and expired
    await Subscription.updateMany(
      { vendor: vendorId },
      {
        isActive: false,
        subscriptionStatus: "Expired",
      }
    );

    // Create new subscription with services array
    const newSubscription = await Subscription.create({
      vendor: vendorId,
      vendorName: vendor.name,
      vendorReferenceId: vendor.vendorReferenceId,
      planPrice: totalPrice,
      startDate,
      endDate,
      paymentStatus: "Paid",
      subscriptionStatus: "Active",
      isActive: true,
      services: vendor.services.map((service) => ({
        name: service,
        addedOn: startDate,
        proratedPrice: basePrice,
      })),
    });

    // Send email confirmation
    await sendSubscriptionEmail(
      vendor.email,
      "Subscription Activated 🎉",
      `Hi ${vendor.name},

Your subscription has been successfully activated for 1 year.
Reference ID: ${vendor.vendorReferenceId}
Total Price: ₹${basePrice} × ${numberOfServices} = ₹${totalPrice}
Expires On: ${endDate.toDateString()}

Thank you for subscribing!

Team Velre`
    );

    res.status(201).json({
      message: `Subscription activated. ₹${basePrice} × ${numberOfServices} services = ₹${totalPrice}`,
      subscription: newSubscription,
    });
  } catch (err) {
    res.status(500).json({
      message: "Subscription purchase failed",
      error: err.message,
    });
  }
};

// ✅ Vendor: Check Subscription Status
exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      vendor: req.user.id,
      isActive: true,
    });

    if (!subscription) {
      return res.status(200).json({
        isActive: false,
        subscriptionStatus: "None",
        message: "No active subscription found",
      });
    }

    const now = new Date();
    const isStillValid = now <= subscription.endDate;

    if (!isStillValid) {
      subscription.isActive = false;
      subscription.subscriptionStatus = "Expired";
      await subscription.save();
    }

    res.status(200).json({
      isActive: isStillValid,
      subscriptionStatus: isStillValid ? "Active" : "Expired",
      expiresOn: subscription.endDate,
      services: subscription.services || [],
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to check subscription",
      error: err.message,
    });
  }
};

// ✅ Vendor: Add New Service to Subscription (with Prorated Price)
exports.addServiceToSubscription = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { newService } = req.body;
    const basePrice = 999;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ msg: "Vendor not found" });

    const subscription = await Subscription.findOne({ vendor: vendorId, isActive: true });
    if (!subscription) return res.status(400).json({ msg: "Active subscription not found" });

    const now = new Date();
    const end = new Date(subscription.endDate);
    const remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    if (remainingDays <= 0) {
      return res.status(400).json({ msg: "Subscription has already expired" });
    }

    // Check if service already added
    const alreadyExists = subscription.services?.some(
      (s) => s.name.toLowerCase() === newService.toLowerCase()
    );
    if (alreadyExists) {
      return res.status(400).json({ msg: "Service already exists in subscription" });
    }

    const proratedPrice = Math.round((remainingDays / 365) * basePrice);

    // Add service to subscription
    subscription.services.push({
      name: newService,
      addedOn: now,
      proratedPrice,
    });

    subscription.planPrice += proratedPrice;
    await subscription.save();

    // Update vendor profile too
    if (!vendor.services.includes(newService)) {
      vendor.services.push(newService);
      await vendor.save();
    }

    res.status(200).json({
      msg: "Service added successfully with prorated price",
      newService,
      remainingDays,
      proratedPrice,
      updatedTotal: subscription.planPrice,
      subscription,
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to add service", error: err.message });
  }
};
