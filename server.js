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

connectDB();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ---------------- AUTH ----------------
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect("/login");
}

// ---------------- LOGIN ----------------
app.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "login.html"));
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
    failureRedirect: "/login"
  }),
  (req, res) => {
    // 🔥 ALWAYS GO TO HOME (NOT dashboard)
    res.redirect("/");
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout(() => res.redirect("/login"));
});

// ---------------- STATIC ----------------
app.use(express.static(path.join(__dirname, "public")));

// ---------------- HOME PAGE (AFTER LOGIN) ----------------
app.get("/", ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------- DASHBOARD (PROTECTED) ----------------
app.get("/dashboard", ensureAuth, (req, res) => {
  const email = req.user?.emails?.[0]?.value;

  if (!allowedUsers.includes(email)) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ---------------- API ----------------
app.use("/attendance", ensureAuth, attendanceRoutes);

app.get("/api/check-admin", ensureAuth, (req, res) => {
  const email = req.user?.emails?.[0]?.value;

  res.json({
    isAdmin: allowedUsers.includes(email)
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("🚀 Server running"));