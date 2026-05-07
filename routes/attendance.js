const express = require("express");
const router = express.Router();

const multer = require("multer");
const streamifier = require("streamifier");

const cloudinary = require("../config/cloudinary");

const ExcelJS = require("exceljs");

const Attendance = require("../models/Attendance");
const allowedUsers = require("../config/allowedUsers");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// ---------------- AUTH ----------------
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ success: false, message: "Not logged in" });
}

function ensureAdmin(req, res, next) {
  const email = req.user?.emails?.[0]?.value?.toLowerCase();
  const admins = allowedUsers.map(e => e.toLowerCase());

  if (admins.includes(email)) return next();

  return res.status(403).json({ success: false, message: "Not authorized" });
}

// ---------------- POST ----------------
router.post("/", ensureAuth, upload.single("image"), async (req, res) => {
  try {
    const email = req.user?.emails?.[0]?.value;
    const name = req.user.displayName || "User";

    const now = new Date();

    const date = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const day = now.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata"
    });
    const time = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata"
    });

    let workTypes = req.body.workTypes;

    if (!workTypes) {
      return res.status(400).json({
        success: false,
        message: "Select at least one option"
      });
    }

    if (typeof workTypes === "string") {
      workTypes = [workTypes];
    }

    workTypes = workTypes.filter(Boolean);

    if (workTypes.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Select at least one option"
      });
    }

    if (workTypes.length > 2) {
      return res.status(400).json({
        success: false,
        message: "Only 2 selections allowed"
      });
    }

    let imageUrl = null;

if (req.file) {

  const uploadFromBuffer = () => {
    return new Promise((resolve, reject) => {

      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "trivi-attendance"
        },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
  };

  const result = await uploadFromBuffer();

  imageUrl = result.secure_url;
}

const updated = await Attendance.findOneAndUpdate(
  { email, date },
  {
    name,
    email,
    date,
    day,
    time,
    workTypes,
    imageUrl
  },
  {
    new: true,
    upsert: true
  }
);

    res.json({
      success: true,
      message: "Saved successfully",
      data: updated
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ---------------- GET ----------------
router.get("/", ensureAuth, async (req, res) => {
  const data = await Attendance.find().sort({ date: -1 });
  res.json(data);
});

// ---------------- EXPORT EXCEL ----------------
router.get("/export/excel", ensureAuth, ensureAdmin, async (req, res) => {
  try {

    const {
      search = "",
      singleDate = "",
      fromDate = "",
      toDate = ""
    } = req.query;

    let records = await Attendance.find().sort({ date: -1 });

    // SEARCH FILTER
    if (search) {
      const s = search.toLowerCase();

      records = records.filter(r =>
        (r.name || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s)
      );
    }

    // DATE FILTER
    if (fromDate && toDate) {
      records = records.filter(r =>
        r.date >= fromDate && r.date <= toDate
      );
    } else if (singleDate) {
      records = records.filter(r =>
        r.date === singleDate
      );
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 35 },
      { header: "Date", key: "date", width: 15 },
      { header: "Day", key: "day", width: 15 },
      { header: "Time", key: "time", width: 15 },
      { header: "Work Type", key: "workTypes", width: 40 }
    ];

    // HEADER STYLE
    worksheet.getRow(1).font = {
      bold: true
    };

    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center"
    };

    records.forEach(item => {
      worksheet.addRow({
        name: item.name || "",
        email: item.email || "",
        date: item.date || "",
        day: item.day || "",
        time: item.time || "",
        workTypes: (item.workTypes || []).join(", ")
      });
    });

    // CENTER ALIGN
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
        };
      });
    });

    const fileName = `attendance-${Date.now()}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );

    await workbook.xlsx.write(res);

    res.end();

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ---------------- UPDATE ----------------
router.put("/:id", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    let { workTypes } = req.body;

    if (!workTypes) {
      return res.status(400).json({
        success: false,
        message: "workTypes required"
      });
    }

    if (typeof workTypes === "string") {
      workTypes = [workTypes];
    }

    if (workTypes.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Select at least one"
      });
    }

    if (workTypes.length > 2) {
      return res.status(400).json({
        success: false,
        message: "Only 2 allowed"
      });
    }

    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      {
        workTypes,
        time: new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata"
        })
      },
      { new: true }
    );

    res.json({
      success: true,
      data: updated
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ---------------- DELETE ----------------
router.delete("/:id", ensureAuth, ensureAdmin, async (req, res) => {
  await Attendance.findByIdAndDelete(req.params.id);

  res.json({
    success: true
  });
});

module.exports = router;