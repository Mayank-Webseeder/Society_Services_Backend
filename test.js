const crypto = require("crypto");

const order_id = "order_RePK0EvwEuWuT2";
const payment_id = "pay_123456789";
const secret = "CiqIWzXtbQ0VDN7xaEh3lV5h"; // your test key secret

const signature = crypto
  .createHmac("sha256", secret)
  .update(order_id + "|" + payment_id)
  .digest("hex");

console.log(signature);
