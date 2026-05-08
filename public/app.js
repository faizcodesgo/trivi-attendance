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

  // CLEAR OLD MESSAGE
  msg.innerText = "";

  // GET CHECKED OPTIONS
  const checked = document.querySelectorAll(
    'input[name="workTypes"]:checked'
  );

  // VALIDATION
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

  // LOADING UI
  if (submitBtn) {

    submitBtn.disabled = true;

    submitBtn.innerText =
      "Submitting...";
  }

  if (loadingBox) {
    loadingBox.style.display = "block";
  }

  // FORM DATA
  const formData = new FormData();

  // IMAGE
  if (imageInput && imageInput.files[0]) {

    formData.append(
      "image",
      imageInput.files[0]
    );
  }

  // WORK TYPES
  checked.forEach(cb => {

    formData.append(
      "workTypes",
      cb.value
    );
  });

  try {

    // API CALL
    const res = await fetch("/attendance", {

      method: "POST",

      credentials: "include",

      body: formData
    });

    const data = await res.json();

    // FAILED
    if (!res.ok) {

      msg.innerText =
        data.message || "Failed to submit";

      return;
    }

    // SUCCESS
    msg.innerText =
      "Attendance submitted successfully";

    // RESET CHECKBOXES
    document
      .querySelectorAll(
        'input[name="workTypes"]'
      )
      .forEach(cb => cb.checked = false);

    // RESET IMAGE
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

    // REMOVE LOADING
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
// STRICT 2 OPTION LIMIT
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
// IMAGE NAME PREVIEW
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
// RESET FORM
// =========================

function resetForm() {

  // RESET CHECKBOXES
  document
    .querySelectorAll(
      'input[name="workTypes"]'
    )
    .forEach(cb => cb.checked = false);

  // RESET IMAGE
  if (imageInput) {

    imageInput.value = "";
  }

  // RESET IMAGE TEXT
  if (imageName) {

    imageName.innerText =
      "No image selected";
  }

  // RESET MESSAGE
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

    // SHOW ONLY FOR ADMINS
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
// OPEN DASHBOARD
// =========================

function goDashboard() {

  window.location.href =
    "/dashboard";
}

// =========================
// INITIALIZE
// =========================

checkAdmin();