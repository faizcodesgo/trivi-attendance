require("dotenv").config();
const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:admin@trivi.com",
  "BPtwROFKy9Rq-Qm8InlFphIJYPZxwfrViN8HWj3wPwXYQ2n_HFA3w186rrHglumFXxyWxgkQo6lr-C3f_loeAcE",
  "XrLEIOSEQLth78oz_JdQtssQ5Y2jkcf2eaaonwFqtP4"
);

// load saved subscriptions from DB here

async function send() {
  const payload = JSON.stringify({
    title: "TriVi Attendance Reminder",
    body: "Please mark today's attendance."
  });

  for (const sub of subscriptions) {
    await webpush.sendNotification(sub, payload);
  }

  console.log("Notifications sent");
}

send();