const crypto = require("crypto");

const key = "CiqIWzXtbQ0VDN7xaEh3lV5h"; // put your test secret here TEMPORARILY
const orderId = "order_RoDgxYzvaVrZTb";
const paymentId = "pay_123456789";

const sig = crypto
  .createHmac("sha256", key)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");


