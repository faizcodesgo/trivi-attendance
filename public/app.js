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

// SERVICE WORKER
if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register("/sw.js")
    .then(() => {

      console.log(
        "Service Worker Registered"
      );

    });

}

// SUBSCRIBE USER
async function subscribeUser() {

  const registration =
    await navigator.serviceWorker.ready;

  const subscription =
    await registration.pushManager.subscribe({

      userVisibleOnly: true,

      applicationServerKey:
      "BPtwROFKy9Rq-Qm8InlFphIJYPZxwfrViN8HWj3wPwXYQ2n_HFA3w186rrHglumFXxyWxgkQo6lr-C3f_loeAcE"

    });

  await fetch("/subscribe", {

    method: "POST",

    headers: {
      "Content-Type":
        "application/json"
    },

    body:
      JSON.stringify(subscription)

  });

}

// ASK PERMISSION
if ("Notification" in window) {

  Notification
    .requestPermission()
    .then(permission => {

      if (
        permission === "granted"
      ) {

        subscribeUser();

      }

    });

}