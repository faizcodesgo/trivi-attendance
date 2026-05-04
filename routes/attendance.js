<<<<<<< HEAD
const express = require("express");
const router = express.Router();

const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const Attendance = require("../models/Attendance");

// --------------------
// Multer setup
// --------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --------------------
// Helper: Day name
// --------------------
const getDayName = (dateStr) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dateObj = new Date(dateStr);
  return days[dateObj.getDay()];
};

// --------------------
// POST /attendance
// --------------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const name = req.body.name;
    const date = req.body.date;

    let workTypes = req.body.workTypes;

    if (!name || !date || !workTypes) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    if (typeof workTypes === "string") {
      workTypes = workTypes.split(",");
    }

    // 🚨 TEMPORARY: disable image completely
    const imageUrl = null;

    const day = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const existing = await Attendance.findOne({ name, date });

    if (existing) {
      existing.workTypes = workTypes;
      existing.imageUrl = imageUrl;
      existing.time = new Date().toLocaleTimeString();

      const updated = await existing.save();

      return res.json({
        success: true,
        message: "Updated",
        data: updated,
      });
    }

    const newEntry = new Attendance({
      name,
      date,
      day,
      time: new Date().toLocaleTimeString(),
      workTypes,
      imageUrl,
    });

    const saved = await newEntry.save();

    return res.status(201).json({
      success: true,
      message: "Created",
      data: saved,
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({
      success: false,
      message: "err.message",
    });
  }
});

module.exports = router;
=======
const express = require("express");
const router = express.Router();

const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const Attendance = require("../models/Attendance");

// --------------------
// Multer setup
// --------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --------------------
// Helper: Day name
// --------------------
const getDayName = (dateStr) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dateObj = new Date(dateStr);
  return days[dateObj.getDay()];
};

// --------------------
// POST /attendance
// --------------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const name = req.body.name;
    const date = req.body.date;

    let workTypes = req.body.workTypes;

    if (!name || !date || !workTypes) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    if (typeof workTypes === "string") {
      workTypes = workTypes.split(",");
    }

    // 🚨 TEMPORARY: disable image completely
    const imageUrl = null;

    const day = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const existing = await Attendance.findOne({ name, date });

    if (existing) {
      existing.workTypes = workTypes;
      existing.imageUrl = imageUrl;
      existing.time = new Date().toLocaleTimeString();

      const updated = await existing.save();

      return res.json({
        success: true,
        message: "Updated",
        data: updated,
      });
    }

    const newEntry = new Attendance({
      name,
      date,
      day,
      time: new Date().toLocaleTimeString(),
      workTypes,
      imageUrl,
    });

    const saved = await newEntry.save();

    return res.status(201).json({
      success: true,
      message: "Created",
      data: saved,
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
>>>>>>> dd49053 (initial commit)
