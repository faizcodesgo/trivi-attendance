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
          folder: "trivi-attendance",
          resource_type: "image",
          // Compress + cap size on upload to save storage and bandwidth.
          transformation: [
            { width: 1600, height: 1600, crop: "limit" },
            { quality: "auto:good" },
            { fetch_format: "auto" }
          ]
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

  records = records.filter(r => {

    const recordDate =
      new Date(r.date)
      .toISOString()
      .split("T")[0];

    return (
      recordDate >= fromDate
      &&
      recordDate <= toDate
    );
  });

}

else if (singleDate) {

  records = records.filter(r => {

    const recordDate =
      new Date(r.date)
      .toISOString()
      .split("T")[0];

    return recordDate === singleDate;
  });
}

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TriVi Infracons";

    const worksheet = workbook.addWorksheet("Attendance", {
      // Keep the title + header visible while scrolling.
      views: [{ state: "frozen", ySplit: 3 }]
    });

    // Column widths
    const widths = [24, 32, 14, 12, 14, 34, 16];
    widths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });

    const thin = { style: "thin", color: { argb: "FFD9E3EA" } };
    const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

    // ---- TITLE BANNER (row 1) ----
    worksheet.mergeCells("A1:G1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "TriVi Infracons  —  Attendance Report";
    titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2433" } };
    worksheet.getRow(1).height = 30;

    // ---- SUBTITLE (row 2) ----
    worksheet.mergeCells("A2:G2");
    const subCell = worksheet.getCell("A2");
    subCell.value =
      `Exported ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}   •   ${records.length} record(s)`;
    subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF5B6B76" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(2).height = 18;

    // ---- HEADER ROW (row 3) ----
    const headerRow = worksheet.getRow(3);
    headerRow.values = ["Name", "Email", "Date", "Day", "Time", "Work Type", "Image"];
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", bold: true, color: { argb: "FF3A2A08" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0A23C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll;
    });

    // ---- DATA ROWS (row 4 onward) ----
    records.forEach((item, idx) => {
      const row = worksheet.addRow([
        item.name || "",
        item.email || "",
        item.date || "",
        item.day || "",
        item.time || "",
        (item.workTypes || []).join(", "),
        item.imageUrl ? "View Image" : "No Image"
      ]);

      row.height = 20;

      // Alternating light row banding for readability.
      const band = idx % 2 === 0 ? "FFFFFFFF" : "FFF7F2EA";

      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = borderAll;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: band } };
        cell.font = { name: "Calibri", color: { argb: "FF0B2433" } };
      });

      // Clickable image link
      if (item.imageUrl) {
        const imageCell = row.getCell(7);
        imageCell.value = { text: "View Image", hyperlink: item.imageUrl };
        imageCell.font = { name: "Calibri", color: { argb: "FF0A5C8A" }, underline: true };
      }
    });

    // Filter dropdowns on the header row
    worksheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 7 } };

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