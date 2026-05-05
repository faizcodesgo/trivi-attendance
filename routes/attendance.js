const express = require("express");
const router = express.Router();

const multer = require("multer");
const Attendance = require("../models/Attendance");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔐 Require login
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Not logged in" });
}

// --------------------
// POST /attendance
// --------------------
router.post("/", ensureAuth, upload.single("image"), async (req, res) => {
  try {
    const email = req.user.emails[0].value; // 🔥 UNIQUE USER
    const name = req.user.displayName;      // optional (auto-fill name)
    const date = req.body.date;

    let workTypes = req.body.workTypes;

    if (!date || !workTypes) {
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

    // 🔥 CHECK using email + date (NOT name)
    const existing = await Attendance.findOne({ email, date });

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
      email, // 🔥 ADD THIS
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
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// --------------------
// GET /attendance (for dashboard)
// --------------------
router.get("/", ensureAuth, async (req, res) => {
  const data = await Attendance.find().sort({ date: -1 });
  res.json(data);
});

module.exports = router;