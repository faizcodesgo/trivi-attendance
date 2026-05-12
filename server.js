const path = require("path");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const webpush = require("web-push");
const cron = require("node-cron");

require("./config/passport");

const connectDB = require("./config/db");
const attendanceRoutes = require("./routes/attendance");
const allowedUsers = require("./config/allowedUsers");

const app = express();

app.set("trust proxy", 1);

connectDB();

/* ---------------- PUSH SETUP ---------------- */

webpush.setVapidDetails(
  "mailto:admin@trivi.com",

  "BPtwROFKy9Rq-Qm8InlFphIJYPZxwfrViN8HWj3wPwXYQ2n_HFA3w186rrHglumFXxyWxgkQo6lr-C3f_loeAcE",

  "XrLEIOSEQLth78oz_JdQtssQ5Y2jkcf2eaaonwFqtP4"
);
let subscriptions = [];

/* ---------------- MIDDLEWARE ---------------- */

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- SESSION ---------------- */

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

/* ---------------- DEBUG ---------------- */

app.use((req, res, next) => {
  console.log("➡️", req.method, req.url, "| Auth:", req.isAuthenticated());
  next();
});

/* ---------------- AUTH CHECK ---------------- */

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect("/login");
}

/* ---------------- GOOGLE AUTH ---------------- */

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
    res.redirect("/");
  }
);

/* ---------------- LOGOUT ---------------- */

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });
});

/* ---------------- LOGIN ---------------- */

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }

  res.sendFile(
    path.join(__dirname, "public", "login.html")
  );
});

/* ---------------- ROOT ---------------- */

app.get("/", (req, res) => {

  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  return res.sendFile(
    path.join(__dirname, "public", "index.html")
  );

});

/* ---------------- DASHBOARD ---------------- */

app.get("/dashboard", ensureAuth, (req, res) => {

  const email = req.user.emails?.[0]?.value;

  if (!allowedUsers.includes(email)) {
    return res.redirect("/");
  }

  res.sendFile(
    path.join(__dirname, "public", "dashboard.html")
  );

});

/* ---------------- STATIC ---------------- */

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

/* ---------------- ATTENDANCE ---------------- */

app.use(
  "/attendance",
  ensureAuth,
  attendanceRoutes
);

/* ---------------- ADMIN CHECK ---------------- */

app.get("/api/check-admin", ensureAuth, (req, res) => {

  const email = req.user.emails?.[0]?.value;

  res.json({
    isAdmin: allowedUsers.includes(email)
  });

});

/* ---------------- PUSH SUBSCRIBE ---------------- */

app.post("/subscribe", (req, res) => {

  subscriptions.push(req.body);

  res.status(201).json({});

});

/* ---------------- DAILY 10AM REMINDER ---------------- */

cron.schedule("0 10 * * *", async () => {

  const payload = JSON.stringify({
    title: "TriVi Attendance Reminder",
    body: "Please mark today's attendance."
  });

  for (const sub of subscriptions) {

    try {
      await webpush.sendNotification(
        sub,
        payload
      );
    } catch (err) {
      console.log(err);
    }

  }

});

app.get("/send-reminder", async (req, res) => {

  const payload = JSON.stringify({
    title: "TriVi Attendance Reminder",
    body: "Please mark today's attendance."
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub,
        payload
      );
    } catch (err) {
      console.log(err);
    }
  }

  res.send("Reminder sent");

});

/* ---------------- START ---------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running");
});