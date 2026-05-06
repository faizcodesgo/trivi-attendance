const path = require("path");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

require("./config/passport");

const connectDB = require("./config/db");
const attendanceRoutes = require("./routes/attendance");
const allowedUsers = require("./config/allowedUsers");

const app = express();

app.set("trust proxy", 1);

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
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: "none"
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Debug ---
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url, "| Auth:", req.isAuthenticated());
  next();
});

// --- Static ---
app.use(express.static(path.join(__dirname, "public")));

// 🔐 Auth check
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect("/login");
}

// ---------------- AUTH ----------------
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

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

app.get("/unauthorized", (req, res) => {
  res.send("Access Denied ❌");
});

// ---------------- ROUTES ----------------

// 🔥 LOGIN PAGE FIRST
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// 🔥 HOME (ONLY AFTER LOGIN)
app.get("/", ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------- ATTENDANCE ----------------
app.use("/attendance", attendanceRoutes);

// ---------------- DASHBOARD (PROTECTED) ----------------
app.get("/dashboard", ensureAuth, (req, res) => {
  const email = req.user.emails[0].value;

  if (!allowedUsers.includes(email)) {
    return res.send("Access Denied ❌");
  }

  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ---------------- DASHBOARD API ----------------
app.get("/api/attendance", ensureAuth, async (req, res) => {
  const email = req.user.emails[0].value;

  if (!allowedUsers.includes(email)) {
    return res.status(403).json({ message: "Forbidden" });
  }

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
  console.log("🚀 Server running");
});