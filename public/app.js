async function submitAttendance() {
  const msg = document.getElementById("msg");

  const checked = document.querySelectorAll('input[name="workTypes"]:checked');

  if (checked.length === 0) {
    msg.innerText = "Select at least one option";
    return;
  }

  if (checked.length > 2) {
    msg.innerText = "Only 2 allowed";
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
    msg.innerText = data.message || "Success";

    document.querySelectorAll('input[name="workTypes"]').forEach(cb => cb.checked = false);

  } catch (err) {
    msg.innerText = "Error";
  }
}

// 🔥 STRICT LIMIT LIVE CHECK
document.querySelectorAll('input[name="workTypes"]').forEach(cb => {
  cb.addEventListener("change", () => {
    const checked = document.querySelectorAll('input[name="workTypes"]:checked');

    if (checked.length > 2) {
      cb.checked = false;
      alert("Only 2 allowed");
    }
  });
});