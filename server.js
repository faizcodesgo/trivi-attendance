const path = require("path");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const webpush = require("web-push");
const cron = require("node-cron");
const helmet = require("helmet");
const MongoStore = require("connect-mongo");

require("./config/passport");

const connectDB = require("./config/db");
const attendanceRoutes = require("./routes/attendance");
const allowedUsers = require("./config/allowedUsers");
const Subscription = require("./models/Subscription");

const app = express();

app.set("trust proxy", 1);

connectDB();

/* ---------------- ONE-TIME DATA NORMALIZATION ---------------- */
// We now store attendance emails in lowercase. Lowercase any pre-existing
// records once so old history still matches the new lowercase lookups.
// Idempotent: after the first run it matches nothing and does nothing.
(async function normalizeAttendanceEmails() {
  try {
    const Attendance = require("./models/Attendance");
    const result = await Attendance.updateMany(
      { email: { $regex: /[A-Z]/ } },
      [{ $set: { email: { $toLower: "$email" } } }]
    );
    if (result.modifiedCount) {
      console.log(`Normalized ${result.modifiedCount} attendance email(s) to lowercase`);
    }
  } catch (err) {
    console.log("Email normalization skipped:", err.message);
  }
})();

/* ---------------- PUSH SETUP ---------------- */

webpush.setVapidDetails(
  "mailto:admin@trivi.com",
  process.env.PUBLIC_KEY,
  process.env.PRIVATE_KEY
);

/* ---------------- SECURITY HEADERS ---------------- */
// Adds standard protective HTTP headers. CSP is disabled because the
// pages use inline scripts / styles and load images from Cloudinary & a CDN.
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

/* ---------------- MIDDLEWARE ---------------- */

app.use(cors({
  // Same-origin app — only allow our own site to make credentialed calls.
  origin: ["https://trivi-attendance.onrender.com"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- SESSION ---------------- */

app.use(session({
  secret: process.env.SESSION_SECRET,
  // Persist sessions in MongoDB so a server restart doesn't log everyone out
  // (keeps users signed in for the full 7 days).
  store: MongoStore.create({
    mongoUrl: connectDB.sanitizeUri(process.env.MONGO_URI),
    ttl: 7 * 24 * 60 * 60
  }),
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
  if (process.env.NODE_ENV !== "production") {
    console.log("➡️", req.method, req.url, "| Auth:", req.isAuthenticated());
  }
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

/* ---------------- EMPLOYEES (admin roster) ---------------- */

app.use(
  "/employees",
  ensureAuth,
  require("./routes/employees")
);

/* ---------------- ADMIN CHECK ---------------- */

app.get("/api/check-admin", ensureAuth, (req, res) => {

  const email = req.user.emails?.[0]?.value;

  res.json({
    isAdmin: allowedUsers.includes(email),
    name: req.user.displayName || "there",
    email
  });

});

/* ---------------- PUSH SUBSCRIBE ---------------- */

app.post("/subscribe", ensureAuth, async (req, res) => {

  try {

    const { endpoint, keys } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "Invalid subscription" });
    }

    // Save (or update) the subscription in the database.
    await Subscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys },
      { upsert: true, new: true }
    );

    res.status(201).json({});

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Subscribe failed" });
  }

});

/* ---------------- REMINDER SENDER ---------------- */

async function sendReminders() {

  const payload = JSON.stringify({
    title: "TriVi Attendance Reminder",
    body: "Please mark today's attendance."
  });

  const subs = await Subscription.find();

  for (const sub of subs) {

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
    } catch (err) {
      // Subscription is gone/expired — remove it so we don't keep retrying.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await Subscription.deleteOne({ endpoint: sub.endpoint });
      } else {
        console.log(err);
      }
    }

  }

}

/* ---------------- DAILY 10 AM REMINDER (IST) ---------------- */

cron.schedule("0 10 * * *", sendReminders, {
  timezone: "Asia/Kolkata"
});

/* ---------------- MANUAL REMINDER ROUTE ---------------- */

app.get("/send-reminder", (req, res) => {
  // Always require the secret header. If CRON_SECRET isn't configured, refuse
  // outright so a stranger can never trigger push notifications to everyone.
  if (!process.env.CRON_SECRET || req.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return res.status(401).send("Unauthorized");
  }
  // Respond immediately, then push in the background so the request never hangs.
  res.status(202).send("Reminder triggered");
  sendReminders().catch(err => console.log(err));
});

/* ---------------- START ---------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running");
});
