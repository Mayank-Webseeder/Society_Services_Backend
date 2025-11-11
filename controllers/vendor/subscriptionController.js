const Subscription = require("../../models/Subscription");
const Vendor = require("../../models/vendorSchema");
const { sendSubscriptionEmail } = require("../../utils/notify");


const razorpay = require("../../utils/razorpay");
const crypto = require("crypto");

exports.createRazorpayOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const vendor = await Vendor.findById(vendorId).populate("services", "name price isActive");
    if (!vendor || !vendor.services || vendor.services.length === 0) {
      return res.status(400).json({ msg: "Vendor not found or no active services selected" });
    }

    // Only use active services
    const activeServices = vendor.services.filter((s) => s.isActive);
    if (activeServices.length === 0) {
      return res.status(400).json({ msg: "No active services available" });
    }

    // Calculate total based on actual prices
    const totalPrice = activeServices.reduce((sum, s) => sum + s.price, 0);
    const totalAmountPaise = totalPrice * 100; // Razorpay expects paise

    const options = {
      amount: totalAmountPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { vendorId, vendorName: vendor.name },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      vendorId,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      vendorName: vendor.name,
      numberOfServices: activeServices.length,
      totalPrice,
    });
  } catch (err) {
    console.error("❌ createRazorpayOrder error:", err);
    res.status(500).json({ msg: "Failed to create order", error: err.message });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ msg: "Invalid payment signature" });
    }

    const vendor = await Vendor.findById(vendorId).populate("services", "name price");
    if (!vendor || !vendor.services.length) {
      return res.status(404).json({ msg: "Vendor or services not found" });
    }

    const totalPrice = vendor.services.reduce((sum, s) => sum + s.price, 0);
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    await Subscription.updateMany({ vendor: vendorId }, { isActive: false, subscriptionStatus: "Expired" });

    const newSubscription = await Subscription.create({
  vendor: vendorId,
  vendorName: vendor.name,
  vendorReferenceId: vendor.vendorReferenceId,  // ✅ FIXED
  planPrice: totalPrice,
  startDate,
  endDate,
  paymentStatus: "Paid",
  subscriptionStatus: "Active",
  isActive: true,
  services: vendor.services.map((s) => ({
    service: s._id,
    name: s.name,
    addedOn: startDate,
    proratedPrice: s.price,
  })),
});


    res.status(201).json({
      msg: "Payment verified — subscription activated",
      subscription: newSubscription,
    });
  } catch (err) {

    console.error("❌ verifyRazorpayPayment error:", err);
    res.status(500).json({ msg: "Payment verification failed", error: err.message });
  }
};



// ✅ Vendor: Check Subscription Status
exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      vendor: req.user.id,
      isActive: true,
    }).populate("services.service", "name price isActive");

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
    console.error("❌ checkSubscriptionStatus error:", err);
    res.status(500).json({ message: "Failed to check subscription", error: err.message });
  }
};



// ✅ Vendor: Add New Service to Subscription (with Prorated Price)

exports.createAddServiceOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { newServices } = req.body; // array of service IDs

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ msg: "Vendor not found" });

    const subscription = await Subscription.findOne({ vendor: vendorId, isActive: true });
    if (!subscription) return res.status(400).json({ msg: "Active subscription not found" });

    const now = new Date();
    const remainingDays = Math.ceil((new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24));
    if (remainingDays <= 0) return res.status(400).json({ msg: "Subscription expired" });

    // Normalize input
    const servicesToAdd = Array.isArray(newServices) ? newServices : [newServices];

    // Remove duplicates
    const existingServiceIds = vendor.services.map((s) => s.toString());
    const uniqueNewServiceIds = servicesToAdd.filter((id) => !existingServiceIds.includes(id));

    if (uniqueNewServiceIds.length === 0)
      return res.status(400).json({ msg: "All provided services already exist" });

    // Fetch new services and calculate prorated price
    const services = await Services.find({ _id: { $in: uniqueNewServiceIds }, isActive: true });
    const totalPrice = services.reduce((sum, s) => sum + Math.round((remainingDays / 365) * s.price), 0);
    const amount = totalPrice * 100;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `addService_${Date.now()}`,
      notes: { vendorId, services: uniqueNewServiceIds },
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      newServices: services.map((s) => s.name),
      perServicePrice: services.map((s) => Math.round((remainingDays / 365) * s.price)),
      totalServices: uniqueNewServiceIds.length,
      remainingDays,
    });
  } catch (err) {
    console.error("❌ createAddServiceOrder error:", err);
    res.status(500).json({ msg: "Failed to create Razorpay order", error: err.message });
  }
};







// ✅ Step 2: Verify Razorpay Payment and add the new service
exports.verifyAddServicePayment = async (req, res) => {
  try {
    const vendorId = req.user.id;
    let { razorpay_payment_id, razorpay_order_id, razorpay_signature, newServices } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ msg: "Invalid payment signature" });

    const vendor = await Vendor.findById(vendorId);
    const subscription = await Subscription.findOne({ vendor: vendorId, isActive: true });
    if (!subscription) return res.status(400).json({ msg: "Active subscription not found" });

    const now = new Date();
    const remainingDays = Math.ceil((new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24));

    const servicesToAdd = Array.isArray(newServices) ? newServices : [newServices];
    const existingServiceIds = vendor.services.map((s) => s.toString());
    const uniqueNewServiceIds = servicesToAdd.filter((id) => !existingServiceIds.includes(id));

    const services = await Services.find({ _id: { $in: uniqueNewServiceIds }, isActive: true });

    // Add each to subscription and vendor
    services.forEach((s) => {
      const proratedPrice = Math.round((remainingDays / 365) * s.price);
      subscription.services.push({
        service: s._id,
        name: s.name,
        addedOn: now,
        proratedPrice,
      });
      vendor.services.push(s._id);
      subscription.planPrice += proratedPrice;
    });

    await subscription.save();
    await vendor.save();

    res.status(200).json({
      msg: "Payment verified — new services added successfully",
      addedServices: services.map((s) => s.name),
      updatedPlanPrice: subscription.planPrice,
      remainingDays,
      subscription,
    });
  } catch (err) {
    console.error("❌ verifyAddServicePayment error:", err);
    res.status(500).json({ msg: "Failed to verify payment or add services", error: err.message });
  }
};

