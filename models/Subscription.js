const mongoose = require("mongoose");

// Stores browser push-notification subscriptions so reminders survive
// server restarts/redeploys (previously they were kept only in memory).
const subscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: String,
      auth: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
