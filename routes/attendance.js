const express = require("express");
const router = express.Router();

const multer = require("multer");
const Attendance = require("../models/Attendance");
const allowedUsers = require("../config/allowedUsers");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------- AUTH ----------------
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ success: false, message: "Not logged in" });
}

function ensureAdmin(req, res, next) {
  const email = req.user?.emails?.[0]?.value?.toLowerCase();
  const admins = allowedUsers.map(e => e.toLowerCase());

  if (admins.includes(email)) return next();

  return res.status(403).json({ success: false, message: "Not authorized" });
}

// ---------------- POST ----------------
router.post("/", ensureAuth, upload.single("image"), async (req, res) => {
  try {
    const email = req.user?.emails?.[0]?.value;
    const name = req.user.displayName || "User";

    const now = new Date();

    const date = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const day = now.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata"
    });
    const time = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata"
    });

    let workTypes = req.body.workTypes;

    // normalize
    if (!workTypes) {
      return res.status(400).json({ success: false, message: "Select at least one option" });
    }

    if (typeof workTypes === "string") {
      workTypes = [workTypes];
    }

    workTypes = workTypes.filter(Boolean);

    // STRICT LIMIT
    if (workTypes.length < 1) {
      return res.status(400).json({ success: false, message: "Select at least one option" });
    }

    if (workTypes.length > 2) {
      return res.status(400).json({ success: false, message: "Only 2 selections allowed" });
    }

    const updated = await Attendance.findOneAndUpdate(
      { email, date },
      { name, email, date, day, time, workTypes, imageUrl: null },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "Saved successfully", data: updated });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- GET ----------------
router.get("/", ensureAuth, async (req, res) => {
  const data = await Attendance.find().sort({ date: -1 });
  res.json(data);
});

// ---------------- UPDATE ----------------
router.put("/:id", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    let { workTypes } = req.body;

    if (!workTypes) {
      return res.status(400).json({ success: false, message: "workTypes required" });
    }

    if (typeof workTypes === "string") {
      workTypes = [workTypes];
    }

    if (workTypes.length < 1) {
      return res.status(400).json({ success: false, message: "Select at least one" });
    }

    if (workTypes.length > 2) {
      return res.status(400).json({ success: false, message: "Only 2 allowed" });
    }

    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      { workTypes, time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) },
      { new: true }
    );

    res.json({ success: true, data: updated });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- DELETE ----------------
router.delete("/:id", ensureAuth, ensureAdmin, async (req, res) => {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;