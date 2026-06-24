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
      "Attendance submitted successfully";

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
        "Submit Attendance";
    }

    if (loadingBox) {

      loadingBox.style.display =
        "none";
    }
  }
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
  });
});

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
// DASHBOARD
// =========================

function goDashboard() {

  window.location.href =
    "/dashboard";
}

// =========================
// INITIALIZE
// =========================

checkAdmin();

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