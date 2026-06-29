const express = require("express");
const router = express.Router();

const Employee = require("../models/Employee");
const allowedUsers = require("../config/allowedUsers");

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

// ---------------- LIST ----------------
router.get("/", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const list = await Employee.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- ADD / UPDATE ----------------
router.post("/", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    let { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    name = String(name).trim();
    email = String(email).toLowerCase().trim();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email" });
    }

    // Upsert so re-adding the same email just updates the name (no duplicates).
    const emp = await Employee.findOneAndUpdate(
      { email },
      { name, email },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- DELETE ----------------
router.delete("/:id", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
