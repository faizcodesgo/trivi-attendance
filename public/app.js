// =========================
// SUBMIT ATTENDANCE
// =========================

async function submitAttendance() {

  const msg =
    document.getElementById("msg");

  const submitBtn =
    document.getElementById("submitBtn");

  const loadingBox =
    document.getElementById("loadingBox");

  const imageInput =
    document.getElementById("image");

  msg.innerText = "";

  const checked = document.querySelectorAll(
    'input[name="workTypes"]:checked'
  );

  if (checked.length === 0) {

    msg.innerText =
      "Select at least one option";

    return;
  }

  if (checked.length > 2) {

    msg.innerText =
      "Only 2 selections allowed";

    return;
  }

  if (submitBtn) {

    submitBtn.disabled = true;

    submitBtn.classList.add("loading-btn");

    submitBtn.innerText =
      "Submitting...";
  }

  if (
    loadingBox &&
    imageInput &&
    imageInput.files[0]
  ) {

    loadingBox.style.display =
      "block";
  }

  const formData = new FormData();

  if (imageInput && imageInput.files[0]) {

    formData.append(
      "image",
      imageInput.files[0]
    );
  }

  checked.forEach(cb => {

    formData.append(
      "workTypes",
      cb.value
    );
  });

  try {

    // Site Visit requires on-site proof: a photo + GPS location.
    const isSite = Array.from(checked).some(cb => cb.value === "Site Visit");
    if (isSite) {
      if (!(imageInput && imageInput.files[0])) {
        msg.innerText = "Site Visit needs a photo taken on site.";
        return;
      }
      try {
        const pos = await getLocation();
        formData.append("lat", pos.lat);
        formData.append("lng", pos.lng);
      } catch (e) {
        msg.innerText = "Site Visit needs your location. Please allow location access and try again.";
        return;
      }
    }

    const res = await fetch("/attendance", {

      method: "POST",

      credentials: "include",

      body: formData
    });

    const data = await res.json();

    if (!res.ok) {

      msg.innerText =
        data.message || "Failed to submit";

      return;
    }

    msg.innerText =
      "Attendance marked successfully ✓";

    // Refresh the employee's own stats + feed right away.
    if (typeof loadMine === "function") loadMine();

    document
      .querySelectorAll(
        'input[name="workTypes"]'
      )
      .forEach(cb => cb.checked = false);

    if (imageInput) {

      imageInput.value = "";

      const imageName =
        document.getElementById("imageName");

      if (imageName) {

        imageName.innerText =
          "No image selected";
      }
    }

  } catch (err) {

    console.log(err);

    msg.innerText =
      "Server error";

  } finally {

    if (submitBtn) {

      submitBtn.disabled = false;

      submitBtn.classList.remove("loading-btn");

      submitBtn.innerText =
        "Mark Attendance";
    }

    if (loadingBox) {

      loadingBox.style.display =
        "none";
    }
  }
}

// =========================
// GEOLOCATION (for Site Visit proof)
// =========================

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Site Visit needs a live camera photo + location — reflect that in the UI.
function updateSiteVisitUI() {
  const site = document.querySelector('input[name="workTypes"][value="Site Visit"]');
  const on = !!(site && site.checked);
  const up = document.getElementById("uploadBtn");
  const note = document.getElementById("proofNote");
  const img = document.getElementById("image");

  if (img) {
    if (on) img.setAttribute("capture", "environment");
    else img.removeAttribute("capture");
  }
  if (up) up.innerText = on ? "📷 Take site photo (required)" : "📷 Upload Image (optional)";
  if (note) note.style.display = on ? "block" : "none";
}

// =========================
// STRICT LIMIT
// =========================

document
.querySelectorAll(
  'input[name="workTypes"]'
)
.forEach(cb => {

  cb.addEventListener("change", () => {

    const checked =
      document.querySelectorAll(
        'input[name="workTypes"]:checked'
      );

    if (checked.length > 2) {

      cb.checked = false;

      alert(
        "Only 2 selections allowed"
      );
    }

    updateSiteVisitUI();
  });
});

updateSiteVisitUI();

// =========================
// IMAGE PREVIEW
// =========================

const imageInput =
  document.getElementById("image");

const imageName =
  document.getElementById("imageName");

if (imageInput && imageName) {

  imageInput.addEventListener(
    "change",

    () => {

      if (imageInput.files.length > 0) {

        imageName.innerText =
          imageInput.files[0].name;

      } else {

        imageName.innerText =
          "No image selected";
      }
    }
  );
}

// =========================
// RESET
// =========================

function resetForm() {

  document
    .querySelectorAll(
      'input[name="workTypes"]'
    )
    .forEach(cb => cb.checked = false);

  if (imageInput) {

    imageInput.value = "";
  }

  if (imageName) {

    imageName.innerText =
      "No image selected";
  }

  const msg =
    document.getElementById("msg");

  if (msg) {

    msg.innerText = "";
  }

  updateSiteVisitUI();
}

// =========================
// ADMIN CHECK
// =========================

async function checkAdmin() {

  try {

    const res = await fetch(
      "/api/check-admin",
      {
        credentials: "include"
      }
    );

    const data = await res.json();

    // Personalised greeting (first name only).
    const greet = document.getElementById("greetName");
    if (greet && data.name) {
      const first = String(data.name).trim().split(" ")[0];
      greet.innerText = `Hi, ${first} 👋`;
    }

    if (data.isAdmin === true) {

      const btn =
        document.getElementById(
          "dashboardBtn"
        );

      if (btn) {

        btn.style.display =
          "block";
      }
    }

  } catch (err) {

    console.log(
      "Admin check failed"
    );
  }
}

// =========================
// MY OWN ATTENDANCE (feed + honest stats + today's status)
// =========================

// Today's date in IST as YYYY-MM-DD (matches how the server stores it).
function istDateStr(d) {
  return (d || new Date()).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function renderTodayDate() {
  const el = document.getElementById("todayDate");
  if (!el) return;
  el.innerText = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Asia/Kolkata"
  });
}

function setHeroStatus(records) {
  const box = document.getElementById("heroStatus");
  const txt = document.getElementById("heroStatusText");
  if (!box || !txt) return;

  const today = istDateStr();
  const todayRec = records.find(r => r.date === today);

  const banner = document.getElementById("doneBanner");
  const bannerText = document.getElementById("doneBannerText");

  if (todayRec) {
    box.classList.add("done");
    txt.innerText = "Marked today · " + (todayRec.workTypes || []).join(", ");
    if (banner) banner.style.display = "flex";
    if (bannerText) {
      bannerText.innerText =
        "All set for today — marked as " + (todayRec.workTypes || []).join(", ") + ".";
    }
  } else {
    box.classList.remove("done");
    txt.innerText = "Not marked yet today";
    if (banner) banner.style.display = "none";
  }
}

function renderMyStats(records) {
  const today = new Date();
  const monthKey = istDateStr(today).slice(0, 7); // YYYY-MM

  // Start of current week (Monday) in IST.
  const istNow = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const dow = (istNow.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(istNow);
  monday.setDate(istNow.getDate() - dow);
  const mondayStr = istDateStr(monday);

  const dates = new Set(records.map(r => r.date));

  let monthCount = 0, weekCount = 0;
  dates.forEach(d => {
    if (d.slice(0, 7) === monthKey) monthCount++;
    if (d >= mondayStr) weekCount++;
  });

  // Current streak: consecutive days up to today (or yesterday) that are marked.
  let streak = 0;
  const cursor = new Date(istNow);
  if (!dates.has(istDateStr(cursor))) cursor.setDate(cursor.getDate() - 1); // allow "not yet today"
  while (dates.has(istDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  setNum("statMonth", monthCount);
  setNum("statWeek", weekCount);
  setNum("statStreak", streak);
}

// Count-up tween (21st.dev "number ticker" feel).
function setNum(id, val) {
  const el = document.getElementById(id);
  if (!el) return;

  const target = Number(val) || 0;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce || target === 0) {
    el.innerText = target;
    return;
  }

  const dur = 650;
  const start = performance.now();

  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.innerText = Math.round(eased * target);
    if (p < 1) requestAnimationFrame(tick);
    else el.innerText = target;
  }
  requestAnimationFrame(tick);
}

// Escape anything from the database before putting it in HTML (prevents XSS).
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderFeed(records) {
  const feed = document.getElementById("feed");
  if (!feed) return;

  if (!records.length) {
    feed.innerHTML = `<div class="feed-empty">No attendance yet — mark your first day above.</div>`;
    return;
  }

  feed.innerHTML = records.slice(0, 12).map(r => {
    const types = esc((r.workTypes || []).join(", "));
    const dateLabel = `${esc(r.day)} · ${esc(r.date)}`;
    const initial = esc(((r.workTypes || [])[0] || "•")[0].toUpperCase());
    const img = r.imageUrl ? encodeURI(r.imageUrl) : "";
    const avatar = img
      ? `<img class="feed-avatar" src="${esc(img)}" alt="Attendance photo">`
      : `<div class="feed-avatar placeholder">${initial}</div>`;
    const time = r.time ? esc(r.time.replace(/:\d{2}\s/, " ")) : "";
    return `
      <div class="feed-item">
        ${avatar}
        <div class="feed-main">
          <div class="f-types">${types || "—"}</div>
          <div class="f-date">${dateLabel}</div>
        </div>
        <div class="f-time">${time}</div>
      </div>`;
  }).join("");
}

async function loadMine() {
  try {
    const res = await fetch("/attendance/mine", { credentials: "include" });
    const data = await res.json();
    const records = Array.isArray(data) ? data : [];

    setHeroStatus(records);
    renderMyStats(records);
    renderFeed(records);
  } catch (err) {
    console.log("Failed to load my attendance", err);
    const feed = document.getElementById("feed");
    if (feed) feed.innerHTML = `<div class="feed-empty">Couldn't load your attendance.</div>`;
  }
}

// =========================
// DASHBOARD
// =========================

function goDashboard() {

  window.location.href =
    "/dashboard";
}

// =========================
// INITIALIZE
// =========================

renderTodayDate();
checkAdmin();
loadMine();

/* =========================
   PUSH NOTIFICATIONS
========================= */

function urlBase64ToUint8Array(base64String) {

  const padding =
    "=".repeat(
      (4 - base64String.length % 4) % 4
    );

  const base64 =
    (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  const outputArray =
    new Uint8Array(
      rawData.length
    );

  for (
    let i = 0;
    i < rawData.length;
    ++i
  ) {
    outputArray[i] =
      rawData.charCodeAt(i);
  }

  return outputArray;
}

// REGISTER SERVICE WORKER (no permission prompt on load)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => console.log("Service Worker Registered"))
    .catch(err => console.log("SW registration failed", err));
}

// SUBSCRIBE USER (only after the user enables reminders)
async function subscribeUser() {

  const registration =
    await navigator.serviceWorker.ready;

  const subscription =
    await registration.pushManager.subscribe({

      userVisibleOnly: true,

      applicationServerKey:
        urlBase64ToUint8Array(
          "BPtwROFKy9Rq-Qm8InlFphIJYPZxwfrViN8HWj3wPwXYQ2n_HFA3w186rrHglumFXxyWxgkQo6lr-C3f_loeAcE"
        )

    });

  await fetch("/subscribe", {

    method: "POST",

    headers: {
      "Content-Type":
        "application/json"
    },

    credentials: "include",

    body:
      JSON.stringify(subscription)

  });

  console.log("Subscribed");

}

// ENABLE REMINDERS (runs on the user's click — required by modern browsers)
async function enableReminders() {

  const btn = document.getElementById("enableReminders");

  if (
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    if (btn) btn.innerText = "Reminders not supported";
    return;
  }

  try {

    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      if (btn) btn.innerText = "Reminders blocked";
      return;
    }

    await subscribeUser();

    if (btn) {
      btn.innerText = "Reminders on";
      btn.classList.add("on");
    }

  } catch (err) {
    console.log(err);
    if (btn) btn.innerText = "Couldn't enable reminders";
  }
}

window.enableReminders = enableReminders;

// Reflect the current permission state on the button at load
(function reflectReminderState() {
  const btn = document.getElementById("enableReminders");
  if (!btn) return;

  if (!("Notification" in window)) {
    btn.style.display = "none";
    return;
  }

  if (Notification.permission === "granted") {
    btn.innerText = "Reminders on";
    btn.classList.add("on");
  }
})();