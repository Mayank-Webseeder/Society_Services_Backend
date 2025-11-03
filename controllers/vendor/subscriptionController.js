const Subscription = require("../../models/Subscription");
const Vendor = require("../../models/vendorSchema");
const { sendSubscriptionEmail } = require("../../utils/notify");


const razorpay = require("../../utils/razorpay");
const crypto = require("crypto");

exports.createRazorpayOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const basePrice = 999;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.services || vendor.services.length === 0) {
      return res.status(400).json({ msg: "Vendor not found or no services selected" });
    }

    const numberOfServices = vendor.services.length;
    const totalPrice = basePrice * numberOfServices * 100; // convert to paise

    const options = {
      amount: totalPrice,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        vendorId,
        vendorName: vendor.name,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID, // send to frontend
      vendorName: vendor.name,
      numberOfServices,
    });
  } catch (err) {
    console.error(err);
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

    // ✅ Payment verified: Activate subscription
    const vendor = await Vendor.findById(vendorId);
    const basePrice = 999;
    const numberOfServices = vendor.services.length;
    const totalPrice = basePrice * numberOfServices;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    await Subscription.updateMany({ vendor: vendorId }, { isActive: false, subscriptionStatus: "Expired" });

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

    res.status(201).json({
      msg: "Payment verified and subscription activated",
      subscription: newSubscription,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Payment verification failed", error: err.message });
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

exports.createAddServiceOrder = async (req, res) => {
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

    // Prevent duplicates
    const alreadyExists = subscription.services?.some(
      (s) => s.name.toLowerCase() === newService.toLowerCase()
    );
    if (alreadyExists) {
      return res.status(400).json({ msg: "Service already exists in subscription" });
    }

    const proratedPrice = Math.round((remainingDays / 365) * basePrice);
    const amount = proratedPrice * 100; // Razorpay takes amount in paise

    const options = {
      amount,
      currency: "INR",
      receipt: `addService_${Date.now()}`,
      notes: { vendorId, newService },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      newService,
      proratedPrice,
      remainingDays,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to create Razorpay order", error: err.message });
  }
};


// ✅ Step 2: Verify Razorpay Payment and add the new service
exports.verifyAddServicePayment = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, newService } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ msg: "Invalid payment signature" });
    }

    const vendor = await Vendor.findById(vendorId);
    const subscription = await Subscription.findOne({ vendor: vendorId, isActive: true });
    if (!subscription) return res.status(400).json({ msg: "Active subscription not found" });

    const basePrice = 999;
    const now = new Date();
    const end = new Date(subscription.endDate);
    const remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    const proratedPrice = Math.round((remainingDays / 365) * basePrice);

    // Add service to subscription
    subscription.services.push({
      name: newService,
      addedOn: now,
      proratedPrice,
    });
    subscription.planPrice += proratedPrice;
    await subscription.save();

    // Add to vendor profile too
    if (!vendor.services.includes(newService)) {
      vendor.services.push(newService);
      await vendor.save();
    }

    res.status(200).json({
      msg: "Payment verified — service added successfully!",
      newService,
      remainingDays,
      proratedPrice,
      updatedTotal: subscription.planPrice,
      subscription,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to verify payment or add service", error: err.message });
  }
};
