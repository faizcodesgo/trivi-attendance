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

// ✅ Required for Render
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
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Debug ---
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url, "| Auth:", req.isAuthenticated());
  next();
});

// 🔐 Auth middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect("/login");
}

// ---------------- GOOGLE AUTH ----------------
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })
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

// ✅ LOGIN (public)
app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ✅ STATIC FILES (only after login)
app.use(express.static(path.join(__dirname, "public")));

// ✅ HOME (protected)
app.get("/", ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------- ATTENDANCE ----------------
app.use("/attendance", ensureAuth, attendanceRoutes);

// ---------------- DASHBOARD ----------------
app.get("/dashboard", ensureAuth, (req, res) => {
  const email = req.user.emails[0].value;

  if (!allowedUsers.includes(email)) {
    return res.redirect("/");
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

// 🔥 COUNT LOGIC
const counts = {
  total: data.length,
  wfh: 0,
  office: 0,
  site: 0,
  leave: 0
};

data.forEach(item => {
  if (item.workTypes.includes("Work From Home")) counts.wfh++;
  if (item.workTypes.includes("Office Management")) counts.office++;
  if (item.workTypes.includes("Site Visit")) counts.site++;
  if (item.workTypes.includes("Leave")) counts.leave++;
});

res.json({
  data,
  counts
});

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------- ADMIN CHECK ----------------
app.get("/api/check-admin", ensureAuth, (req, res) => {
  const email = req.user.emails[0].value;

  if (allowedUsers.includes(email)) {
    return res.json({ isAdmin: true });
  }

  return res.json({ isAdmin: false });
});

// ---------------- START ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚀 Server running");
});