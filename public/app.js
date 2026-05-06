alert("JS is connected");

async function submitAttendance() {
  const msg = document.getElementById("msg");

  const dateObj = new Date();
  const date = dateObj.toISOString().split("T")[0];

  // ✅ ONLY attendance checkboxes (safe selector)
  const checkboxes = document.querySelectorAll('input[name="workTypes"]:checked');

  if (checkboxes.length === 0) {
    msg.innerText = "Select at least one option";
    return;
  }

  if (checkboxes.length > 2) {
    msg.innerText = "You can select only up to 2 options";
    return;
  }

  const workTypes = Array.from(checkboxes).map(cb => cb.value);

  const imageInput = document.getElementById("image");
  const image = imageInput?.files?.[0];

  if (workTypes.includes("Site Visit") && !image) {
    msg.innerText = "Please upload image for Site Visit";
    return;
  }

  const formData = new FormData();

  // ✅ send array properly (multer compatible)
  workTypes.forEach(type => {
    formData.append("workTypes", type);
  });

  formData.append("date", date);

  if (image) {
    formData.append("image", image);
  }

  try {
    const res = await fetch("/attendance", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();

    msg.innerText = data.message || "Submitted successfully";

    // ✅ reset UI after submit
    document.querySelectorAll('input[name="workTypes"]').forEach(cb => cb.checked = false);

    if (imageInput) {
      imageInput.value = "";
      imageInput.style.display = "none";
    }

  } catch (error) {
    console.error(error);
    msg.innerText = "Server error. Try again.";
  }
}

// --------------------
// CHECKBOX RULES
// --------------------
document.querySelectorAll('input[name="workTypes"]').forEach(cb => {
  cb.addEventListener("change", () => {

    const allChecked = document.querySelectorAll('input[name="workTypes"]:checked');

    if (allChecked.length > 2) {
      cb.checked = false;
      alert("Only 2 selections allowed");
      return;
    }

    const siteVisitChecked = document.querySelector('input[value="Site Visit"]')?.checked;
    const imageInput = document.getElementById("image");

    if (imageInput) {
      if (siteVisitChecked) {
        imageInput.style.display = "block";
      } else {
        imageInput.style.display = "none";
        imageInput.value = "";
      }
    }
  });
});