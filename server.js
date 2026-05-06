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
  if (req.isAuthenticated()) {
    const email = req.user?.emails?.[0]?.value;

    if (allowedUsers.includes(email)) {
      return res.redirect("/dashboard");
    }

    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ---------------- STATIC FILES ----------------
app.use(express.static(path.join(__dirname, "public")));

// ---------------- ROOT ROUTE ----------------
app.get("/", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const email = req.user?.emails?.[0]?.value;

  if (allowedUsers.includes(email)) {
    return res.redirect("/dashboard");
  }

  return res.redirect("/login");
});

// ---------------- DASHBOARD ----------------
app.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const email = req.user?.emails?.[0]?.value;

  if (!allowedUsers.includes(email)) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ---------------- ATTENDANCE ----------------
app.use("/attendance", (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Not logged in" });
}, attendanceRoutes);

// ---------------- ADMIN CHECK ----------------
app.get("/api/check-admin", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.json({ isAdmin: false });
  }

  const email = req.user?.emails?.[0]?.value;

  res.json({
    isAdmin: allowedUsers.includes(email)
  });
});

// ---------------- START ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚀 Server running");
});