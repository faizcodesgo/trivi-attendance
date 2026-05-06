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

    // 🔥 UPSERT LOGIC (safe + clean)
    const updated = await Attendance.findOneAndUpdate(
      { email, date },
      {
        name,
        email,
        date,
        day,
        time: new Date().toLocaleTimeString(),
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