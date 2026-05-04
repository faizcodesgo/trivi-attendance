<<<<<<< HEAD
alert("JS is connected");
async function submitAttendance() {

  const name = document.getElementById("name").value;
  const msg = document.getElementById("msg");

  if (!name) {
    msg.innerText = "Please enter your name";
    return;
  }

  const dateObj = new Date();
  const date = dateObj.toISOString().split("T")[0];

  const checkboxes = document.querySelectorAll("input[type=checkbox]:checked");

  if (checkboxes.length === 0) {
    msg.innerText = "Select at least one option";
    return;
  }

  if (checkboxes.length > 2) {
    msg.innerText = "You can select only up to 2 options";
    return;
  }

  let workTypes = [];
  checkboxes.forEach(cb => workTypes.push(cb.value));

  const image = document.getElementById("image").files[0];

  // Require image if Site Visit selected
  if (workTypes.includes("Site Visit") && !image) {
    msg.innerText = "Please upload image for Site Visit";
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("date", date);
 workTypes.forEach(type => {
  formData.append("workTypes", type);
});
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

    msg.innerText = data.message;

  } catch (error) {
    msg.innerText = "Server error. Try again.";
  }
}
document.querySelectorAll("input[type=checkbox]").forEach(cb => {
  cb.addEventListener("change", () => {

    const allChecked = document.querySelectorAll("input[type=checkbox]:checked");

    if (allChecked.length > 2) {
      cb.checked = false;
      alert("Only 2 selections allowed");
      return;
    }

    const siteVisitChecked = document.querySelector('input[value="Site Visit"]').checked;
    const imageInput = document.getElementById("image");

    if (siteVisitChecked) {
      imageInput.style.display = "block";
    } else {
      imageInput.style.display = "none";
      imageInput.value = "";
    }

  });
});
=======
alert("JS is connected");
async function submitAttendance() {

  const name = document.getElementById("name").value;
  const msg = document.getElementById("msg");

  if (!name) {
    msg.innerText = "Please enter your name";
    return;
  }

  const dateObj = new Date();
  const date = dateObj.toISOString().split("T")[0];

  const checkboxes = document.querySelectorAll("input[type=checkbox]:checked");

  if (checkboxes.length === 0) {
    msg.innerText = "Select at least one option";
    return;
  }

  if (checkboxes.length > 2) {
    msg.innerText = "You can select only up to 2 options";
    return;
  }

  let workTypes = [];
  checkboxes.forEach(cb => workTypes.push(cb.value));

  const image = document.getElementById("image").files[0];

  // Require image if Site Visit selected
  if (workTypes.includes("Site Visit") && !image) {
    msg.innerText = "Please upload image for Site Visit";
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("date", date);
 workTypes.forEach(type => {
  formData.append("workTypes", type);
});
  if (image) {
    formData.append("image", image);
  }

  try {
    const res = await fetch("http://localhost:5000/attendance", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();

    msg.innerText = data.message;

  } catch (error) {
    msg.innerText = "Server error. Try again.";
  }
}
document.querySelectorAll("input[type=checkbox]").forEach(cb => {
  cb.addEventListener("change", () => {

    const allChecked = document.querySelectorAll("input[type=checkbox]:checked");

    if (allChecked.length > 2) {
      cb.checked = false;
      alert("Only 2 selections allowed");
      return;
    }

    const siteVisitChecked = document.querySelector('input[value="Site Visit"]').checked;
    const imageInput = document.getElementById("image");

    if (siteVisitChecked) {
      imageInput.style.display = "block";
    } else {
      imageInput.style.display = "none";
      imageInput.value = "";
    }

  });
});
>>>>>>> dd49053 (initial commit)
