const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Google User",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    day: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    workTypes: {
      type: [String],
      required: true,
      enum: [
        "Work From Home",
        "Office Management",
        "Site Visit",
        "Leave",
        "Government Holiday",
      ],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    // Captured for Site Visits (and stored if sent for any type) as proof of presence.
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ email: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);