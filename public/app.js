async function submitAttendance() {
  const msg = document.getElementById("msg");

  const checked = document.querySelectorAll('input[name="workTypes"]:checked');

  if (checked.length === 0) {
    msg.innerText = "Select at least one option";
    return;
  }

  if (checked.length > 2) {
    msg.innerText = "Only 2 selections allowed";
    return;
  }

  const workTypes = Array.from(checked).map(cb => cb.value);

  const formData = new FormData();
const imageInput = document.getElementById("image");

if (imageInput.files[0]) {
  formData.append("image", imageInput.files[0]);
}

  workTypes.forEach(w => formData.append("workTypes", w));

  try {
    const res = await fetch("/attendance", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      msg.innerText = data.message || "Failed to submit";
      return;
    }

    msg.innerText = "Attendance submitted successfully";

    document.querySelectorAll('input[name="workTypes"]').forEach(cb => cb.checked = false);

  } catch (err) {
    msg.innerText = "Server error";
  }
}

// STRICT LIMIT (FIXED)
document.querySelectorAll('input[name="workTypes"]').forEach(cb => {
  cb.addEventListener("change", () => {
    const checked = document.querySelectorAll('input[name="workTypes"]:checked');

    if (checked.length > 2) {
      cb.checked = false;
      alert("Only 2 selections allowed");
    }
  });
});