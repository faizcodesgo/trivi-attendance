const mongoose = require("mongoose");

// Remove duplicate query options (e.g. a stray second "w=majority") from the
// connection string so a copy/paste slip in the env var can't crash startup.
const sanitizeUri = (uri) => {
  if (!uri) return uri;
  const q = uri.indexOf("?");
  if (q === -1) return uri;

  const base = uri.slice(0, q);
  const seen = new Map();
  for (const [k, v] of new URLSearchParams(uri.slice(q + 1))) {
    seen.set(k, v); // last value wins -> drops duplicates
  }
  const query = new URLSearchParams(seen).toString();
  return query ? `${base}?${query}` : base;
};

const connectDB = async () => {
  try {
    await mongoose.connect(sanitizeUri(process.env.MONGO_URI));
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;