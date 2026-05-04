<<<<<<< HEAD
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String, // Format: "2026-05-01"
      required: true,
    },
    day: {
      type: String, // Format: "Monday", "Tuesday", etc.
      required: true,
    },
    time: {
      type: String, // Format: "10:35 AM"
      required: true,
    },
    workTypes: {
      type: [String], // e.g. ["WFH", "Site Visit"]
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
      type: String,  // Will be used in Step 3 (file upload)
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

=======
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String, // Format: "2026-05-01"
      required: true,
    },
    day: {
      type: String, // Format: "Monday", "Tuesday", etc.
      required: true,
    },
    time: {
      type: String, // Format: "10:35 AM"
      required: true,
    },
    workTypes: {
      type: [String], // e.g. ["WFH", "Site Visit"]
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
      type: String,  // Will be used in Step 3 (file upload)
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

>>>>>>> dd49053 (initial commit)
module.exports = mongoose.model("Attendance", attendanceSchema);