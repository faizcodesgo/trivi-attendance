alert("JS connected");

async function submitAttendance() {
  const msg = document.getElementById("msg");

  const checkboxes = document.querySelectorAll('input[name="workTypes"]:checked');

  if (checkboxes.length === 0) {
    msg.innerText = "Select at least one option";
    return;
  }

  if (checkboxes.length > 2) {
    msg.innerText = "You can select only 2 options";
    return;
  }

  const workTypes = Array.from(checkboxes).map(cb => cb.value);

  const imageInput = document.getElementById("image");
  const image = imageInput?.files?.[0];

  const formData = new FormData();

  workTypes.forEach(t => formData.append("workTypes", t));

  if (image) formData.append("image", image);

  try {
    const res = await fetch("/attendance", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();
    msg.innerText = data.message || "Submitted";

    document.querySelectorAll('input[name="workTypes"]').forEach(cb => cb.checked = false);

    if (imageInput) imageInput.value = "";

  } catch (err) {
    msg.innerText = "Server error";
  }
}

// limit selection live
document.querySelectorAll('input[name="workTypes"]').forEach(cb => {
  cb.addEventListener("change", () => {
    const checked = document.querySelectorAll('input[name="workTypes"]:checked');

    if (checked.length > 2) {
      cb.checked = false;
      alert("Only 2 selections allowed");
    }
  });
});