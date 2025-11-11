const crypto = require("crypto");

const order_id = "order_ReKviYh7rPFBuI";  // use your actual orderId from Step 1
const payment_id = "pay_TEST123456789";   // any random fake payment id
const secret = "CiqIWzXtbQ0VDN7xaEh3lV5h"; // your Razorpay key secret from .env
console.log("hello");
const signature = crypto
  .createHmac("sha256", secret)
  .update(order_id + "|" + payment_id)
  .digest("hex");

console.log("Generated fake signature:", signature);
