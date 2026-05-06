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

// ✅ Render fix
app.set("trust proxy", 1);

// DB
connectDB();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
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

// Debug
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url, "| Auth:", req.isAuthenticated());
  next();
});

// Auth check
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

// ---------------- LOGIN ----------------
app.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ---------------- STATIC FILES (SECURE) ----------------
app.use("/public", express.static(path.join(__dirname, "public")));

// ---------------- ROOT ROUTE FIX ----------------
app.get("/", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  return res.redirect("/dashboard");
});

// ---------------- DASHBOARD ----------------
app.get("/dashboard", ensureAuth, (req, res) => {
  const email = req.user.emails?.[0]?.value;

  if (!allowedUsers.includes(email)) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ---------------- ATTENDANCE ROUTES ----------------
app.use("/attendance", ensureAuth, attendanceRoutes);

// ---------------- API ----------------
app.get("/api/check-admin", ensureAuth, (req, res) => {
  const email = req.user.emails?.[0]?.value;

  res.json({
    isAdmin: allowedUsers.includes(email)
  });
});

// START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚀 Server running");
});