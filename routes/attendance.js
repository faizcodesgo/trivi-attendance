const express = require("express");
const router = express.Router();

const multer = require("multer");
const Attendance = require("../models/Attendance");

// --------------------
// Multer setup
// --------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --------------------
// POST /attendance
// --------------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
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
      workTypes = [workTypes];
    }

    const day = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const existing = await Attendance.findOne({ name, date });

    if (existing) {
      existing.workTypes = workTypes;
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
      imageUrl: null,
    });

    const saved = await newEntry.save();

    return res.status(201).json({
      success: true,
      message: "Created",
      data: saved,
    });

  } catch (err) {
    console.error("POST ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// --------------------
// GET /attendance  ✅ (FOR DASHBOARD)
// --------------------
router.get("/", async (req, res) => {
  try {
    const data = await Attendance.find().sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {
    console.error("GET ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;