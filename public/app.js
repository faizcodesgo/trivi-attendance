const MAX_SELECTION = 2;

async function submitAttendance() {
  const msg = document.getElementById("msg");

  const checked = document.querySelectorAll('input[name="workTypes"]:checked');

  if (checked.length === 0) {
    msg.innerText = "Select at least one option";
    return;
  }

  if (checked.length > MAX_SELECTION) {
    msg.innerText = "Only 2 selections allowed";
    return;
  }

  const workTypes = Array.from(checked).map(cb => cb.value);

  const formData = new FormData();
  workTypes.forEach(w => formData.append("workTypes", w));

  try {
    const res = await fetch("/attendance", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();

    msg.innerText = data.message || "Submitted";

    resetForm();

  } catch (err) {
    msg.innerText = "Server error";
  }
}

// 🔥 STRICT LIVE LIMIT (frontend safety)
document.querySelectorAll('input[name="workTypes"]').forEach(cb => {
  cb.addEventListener("change", () => {
    const checked = document.querySelectorAll('input[name="workTypes"]:checked');

    if (checked.length > MAX_SELECTION) {
      cb.checked = false;
      alert("Only 2 selections allowed");
    }
  });
});

// 🔥 RESET FUNCTION (FIXED)
function resetForm() {
  document.querySelectorAll('input[name="workTypes"]').forEach(cb => {
    cb.checked = false;
  });

  const msg = document.getElementById("msg");
  if (msg) msg.innerText = "";

  const img = document.getElementById("image");
  if (img) img.value = "";
}