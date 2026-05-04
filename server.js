const path = require("path");
require("dotenv").config();
console.log("TEST:", process.env.TEST_VAR);

console.log("CLIENT_ID:", process.env.GOOGLECLIENT_ID);

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

require("./config/passport");

const connectDB = require("./config/db");
const attendanceRoutes = require("./routes/attendance");

const app = express();

// --- DB ---
connectDB();

// --- Middleware ---
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Session ---
app.use(session({
  secret: "trivi_secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Debug ---
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

// --- Static frontend ---
app.use(express.static(path.join(__dirname, "public")));

// ---------------- AUTH ----------------
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/auth/google");
}

// ---------------- GOOGLE LOGIN ----------------
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/unauthorized"
  }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get("/unauthorized", (req, res) => {
  res.send("Access Denied ❌");
});

// ---------------- FRONTEND ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------- ATTENDANCE API ----------------
app.use("/attendance", attendanceRoutes);

// ---------------- DASHBOARD PAGE ----------------
app.get("/dashboard", ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ---------------- DASHBOARD API ----------------
app.get("/api/attendance", ensureAuth, async (req, res) => {
  try {
    const Attendance = require("./models/Attendance");
    const data = await Attendance.find().sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------- START ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});