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
    const email = req.user.emails[0].value;
    const name = req.user.displayName || "Google User";

    // 🔥 ALWAYS use IST date (ignore frontend date)
    const now = new Date();

    const date = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata"
    }); // format: YYYY-MM-DD

    const day = now.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata"
    });

    const time = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata"
    });

    let workTypes = req.body.workTypes;

    if (!workTypes) {
      return res.status(400).json({
        success: false,
        message: "Select at least one option",
      });
    }

    if (typeof workTypes === "string") {
      workTypes = [workTypes];
    }

    // 🔥 UPSERT (1 per day per user)
    const updated = await Attendance.findOneAndUpdate(
      { email, date },
      {
        name,
        email,
        date,
        day,
        time,
        workTypes,
        imageUrl: null,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      success: true,
      message: "Attendance saved",
      data: updated,
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
// GET /attendance
// --------------------
router.get("/", ensureAuth, async (req, res) => {
  const data = await Attendance.find().sort({ date: -1 });
  res.json(data);
});

module.exports = router;