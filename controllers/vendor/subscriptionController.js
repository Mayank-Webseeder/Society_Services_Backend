const Services = require("../../models/Services");
const Subscription = require("../../models/Subscription");
const Vendor = require("../../models/vendorSchema");
const razorpay = require("../../utils/razorpay");
const crypto = require("crypto");

// ✅ Create Razorpay order for full subscription purchase
exports.createRazorpayOrder = async (req, res) => {
	try {
		const vendorId = req.user.id;

		// 🧩 Step 1: Check for existing active subscription
		const activeSubscription = await Subscription.findOne({
			vendor: vendorId,
			isActive: true,
			subscriptionStatus: "Active",
			endDate: { $gt: new Date() }, // still valid
		});

		if (activeSubscription) {
			return res.status(400).json({
				msg: "You already have an active subscription.",
				subscription: {
					id: activeSubscription._id,
					expiresOn: activeSubscription.endDate,
					planPrice: activeSubscription.planPrice,
					status: activeSubscription.subscriptionStatus,
				},
			});
		}

		// 🧩 Step 2: Fetch vendor details and active services
		const vendor = await Vendor.findById(vendorId).populate("services", "name price isActive");

		if (!vendor || !vendor.services?.length) {
			return res.status(400).json({ msg: "Vendor not found or no active services selected" });
		}

		// Only use active services
		const activeServices = vendor.services.filter((s) => s.isActive);
		if (activeServices.length === 0) {
			return res.status(400).json({ msg: "No active services available" });
		}

		// 🧮 Step 3: Calculate total price
		const totalPrice = activeServices.reduce((sum, s) => sum + (s.price || 0), 0);
		const totalAmountPaise = Math.max(totalPrice * 100, 100); // Razorpay minimum = 1 INR (100 paise)

		// 🧾 Step 4: Create Razorpay order
		const options = {
			amount: totalAmountPaise,
			currency: "INR",
			receipt: `receipt_${Date.now()}`,
			notes: { vendorId, vendorName: vendor.name },
		};

		const order = await razorpay.orders.create(options);

		// ✅ Step 5: Respond
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


// ✅ Verify Razorpay Payment and activate subscription
exports.verifyRazorpayPayment = async (req, res) => {
	try {
		const vendorId = req.user.id;
		const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

		const body = `${razorpay_order_id}|${razorpay_payment_id}`;
		const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");

		if (expectedSignature !== razorpay_signature) {
			return res.status(400).json({ msg: "Invalid payment signature" });
		}

		const vendor = await Vendor.findById(vendorId).populate("services", "name price");
		if (!vendor || !vendor.services?.length) {
			return res.status(404).json({ msg: "Vendor or services not found" });
		}

		const totalPrice = vendor.services.reduce((sum, s) => sum + (s.price || 0), 0);
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
			services: vendor.services.map((s) => ({
				service: s._id,
				name: s.name,
				addedOn: startDate,
				proratedPrice: s.price,
			})),
		});

		res.status(201).json({
			msg: "Payment verified — subscription activated successfully",
			subscription: newSubscription,
		});
	} catch (err) {
		console.error("❌ verifyRazorpayPayment error:", err);
		res.status(500).json({ msg: "Payment verification failed", error: err.message });
	}
};

// ✅ Check subscription status
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
		res.status(500).json({ msg: "Failed to check subscription", error: err.message });
	}
};

// ✅ Create Razorpay order for adding new services
exports.createAddServiceOrder = async (req, res) => {
	try {
		const vendorId = req.user.id;
		const { newServices } = req.body; // can be names OR IDs

		const vendor = await Vendor.findById(vendorId);
		if (!vendor) return res.status(404).json({ msg: "Vendor not found" });

		const subscription = await Subscription.findOne({ vendor: vendorId, isActive: true });
		if (!subscription) return res.status(400).json({ msg: "Active subscription not found" });

		const now = new Date();
		const remainingDays = Math.ceil((new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24));
		if (remainingDays <= 0) return res.status(400).json({ msg: "Subscription expired" });

		// Normalize input to array
		const servicesToAdd = Array.isArray(newServices) ? newServices : [newServices];

		// ✅ STEP 1: Fetch matching services by name OR ID
		const objectIdRegex = /^[0-9a-fA-F]{24}$/;
		const byId = servicesToAdd.filter((s) => objectIdRegex.test(s));
		const byName = servicesToAdd.filter((s) => !objectIdRegex.test(s));

		const services = await Services.find({
			$or: [{ name: { $in: byName.map((s) => new RegExp(`^${s.trim()}$`, "i")) } }, { _id: { $in: byId } }],
			isActive: true,
		});

		if (!services.length) return res.status(400).json({ msg: "No valid active services found for provided names" });

		// ✅ STEP 2: Remove duplicates already in vendor
		const existingServiceIds = vendor.services.map((s) => s.toString());
		const uniqueServices = services.filter((s) => !existingServiceIds.includes(s._id.toString()));

		if (uniqueServices.length === 0) return res.status(400).json({ msg: "All provided services already exist" });

		// ✅ STEP 3: Calculate prorated total
		const totalPrice = uniqueServices.reduce((sum, s) => sum + Math.round((remainingDays / 365) * (s.price || 0)), 0);
		const amount = Math.max(totalPrice * 100, 100); // ensure ≥ ₹1

		const order = await razorpay.orders.create({
			amount,
			currency: "INR",
			receipt: `addService_${Date.now()}`,
			notes: { vendorId, services: uniqueServices.map((s) => s._id.toString()) },
		});

		res.status(200).json({
			success: true,
			orderId: order.id,
			amount: order.amount,
			currency: order.currency,
			key: process.env.RAZORPAY_KEY_ID,
			newServices: uniqueServices.map((s) => s.name),
			perServicePrice: uniqueServices.map((s) => Math.max(Math.round((remainingDays / 365) * s.price), 1)),
			totalServices: uniqueServices.length,
			remainingDays,
		});
	} catch (err) {
		console.error("❌ createAddServiceOrder error:", err);
		res.status(500).json({ msg: "Failed to create Razorpay order", error: err.message });
	}
};

// ✅ Verify add-service payment and update vendor + subscription
exports.verifyAddServicePayment = async (req, res) => {
	try {
		const vendorId = req.user.id;
		let { razorpay_payment_id, razorpay_order_id, razorpay_signature, newServices } = req.body;

		// 🔐 Step 1: Verify Razorpay signature
		const body = `${razorpay_order_id}|${razorpay_payment_id}`;
		const expectedSignature = crypto
			.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
			.update(body)
			.digest("hex");

		if (expectedSignature !== razorpay_signature)
			return res.status(400).json({ msg: "Invalid payment signature" });

		// 🧩 Step 2: Validate vendor & subscription
		const vendor = await Vendor.findById(vendorId);
		const subscription = await Subscription.findOne({ vendor: vendorId, isActive: true });
		if (!subscription) return res.status(400).json({ msg: "Active subscription not found" });

		const now = new Date();
		const remainingDays = Math.ceil((new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24));

		// 🧾 Step 3: Normalize incoming services
		const servicesToAdd = Array.isArray(newServices) ? newServices : [newServices];

		// 🧠 Step 4: Split into ObjectIds and names (prevent CastError)
		const objectIdRegex = /^[0-9a-fA-F]{24}$/;
		const byId = servicesToAdd.filter((s) => objectIdRegex.test(s));
		const byName = servicesToAdd.filter((s) => !objectIdRegex.test(s));

		// 🧩 Step 5: Find valid services
		const services = await Services.find({
			$or: [
				{ _id: { $in: byId } },
				{ name: { $in: byName.map((s) => new RegExp(`^${s.trim()}$`, "i")) } },
			],
			isActive: true,
		});

		if (!services.length)
			return res.status(400).json({ msg: "No valid active services found for provided names or IDs" });

		// 🧮 Step 6: Filter out already existing ones
		const existingServiceIds = vendor.services.map((s) => s.toString());
		const uniqueServices = services.filter((s) => !existingServiceIds.includes(s._id.toString()));

		if (!uniqueServices.length)
			return res.status(400).json({ msg: "All provided services already exist" });

		// 💸 Step 7: Add services to vendor and subscription
		uniqueServices.forEach((s) => {
			const proratedPrice = Math.max(Math.round((remainingDays / 365) * (s.price || 0)), 1);

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

		// ✅ Step 8: Respond success
		res.status(200).json({
			msg: "Payment verified — new services added successfully",
			addedServices: uniqueServices.map((s) => s.name),
			updatedPlanPrice: subscription.planPrice,
			remainingDays,
			subscription,
		});
	} catch (err) {
		console.error("❌ verifyAddServicePayment error:", err);
		res.status(500).json({
			msg: "Failed to verify payment or add services",
			error: err.message,
		});
	}
};
