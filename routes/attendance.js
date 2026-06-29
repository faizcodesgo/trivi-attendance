const express = require("express");
const router = express.Router();

const multer = require("multer");
const streamifier = require("streamifier");

const cloudinary = require("../config/cloudinary");

const ExcelJS = require("exceljs");

const Attendance = require("../models/Attendance");
const allowedUsers = require("../config/allowedUsers");

// The only work types we accept. Anything else is rejected before it can be
// stored (defence-in-depth on top of the Mongoose enum).
const ALLOWED_TYPES = [
  "Work From Home",
  "Office Management",
  "Site Visit",
  "Leave",
  "Government Holiday"
];

const normEmail = (e) => String(e || "").toLowerCase().trim();

// Coerce to an array and keep only allowed values (drops junk / injection).
function cleanWorkTypes(raw) {
  let wt = raw;
  if (typeof wt === "string") wt = [wt];
  return (wt || []).filter(Boolean).filter(t => ALLOWED_TYPES.includes(t));
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Wrap multer so upload errors (e.g. file too large) return JSON, not an HTML 500.
function uploadSingle(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        success: false,
        message: tooBig ? "Image too large (max 5MB)" : "Image upload failed"
      });
    }
    next();
  });
}

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
router.post("/", ensureAuth, uploadSingle, async (req, res) => {
  try {
    const email = normEmail(req.user?.emails?.[0]?.value);
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

    const workTypes = cleanWorkTypes(req.body.workTypes);

    if (workTypes.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Select at least one valid option"
      });
    }

    if (workTypes.length > 2) {
      return res.status(400).json({
        success: false,
        message: "Only 2 selections allowed"
      });
    }

    // Site Visit requires proof of presence: a photo + GPS location.
    const isSiteVisit = workTypes.includes("Site Visit");
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

    if (isSiteVisit) {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Site Visit needs a photo taken on site."
        });
      }
      if (!hasLocation) {
        return res.status(400).json({
          success: false,
          message: "Site Visit needs your location. Please allow location access and try again."
        });
      }
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

// Only overwrite the image when a new one was actually uploaded,
// otherwise a same-day re-submit would wipe the existing photo.
const updateDoc = { name, email, date, day, time, workTypes };
if (imageUrl) updateDoc.imageUrl = imageUrl;
if (hasLocation) updateDoc.location = { lat, lng };

const updated = await Attendance.findOneAndUpdate(
  { email, date },
  updateDoc,
  {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true
  }
);

    res.json({
      success: true,
      message: "Saved successfully",
      data: updated
    });

  } catch (err) {
    // Double-tap submit can race two upserts on the same {email,date}.
    // That's not an error for the user — their attendance is recorded.
    if (err && err.code === 11000) {
      return res.json({ success: true, message: "Already marked for today" });
    }
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ---------------- BULK MARK (admin) ----------------
// Mark attendance for the whole roster at once (e.g. a government holiday).
// Default: only fills people who haven't marked that day. If overwrite=true,
// it replaces everyone's entry for that date with the chosen work type(s).
router.post("/bulk", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const Employee = require("../models/Employee");

    let { date, overwrite } = req.body;

    const workTypes = cleanWorkTypes(req.body.workTypes);

    if (workTypes.length < 1) {
      return res.status(400).json({ success: false, message: "Select at least one valid work type" });
    }
    if (workTypes.length > 2) {
      return res.status(400).json({ success: false, message: "Only 2 selections allowed" });
    }

    const now = new Date();
    if (!date) {
      date = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const day = new Date(date + "T00:00:00+05:30").toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata"
    });
    const time = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });

    const employees = await Employee.find();
    if (!employees.length) {
      return res.status(400).json({
        success: false,
        message: "Your employee list is empty. Add employees first."
      });
    }

    const emails = employees.map(e => normEmail(e.email));

    // One query to find who already has an entry that day, then one bulkWrite.
    const existingDocs = await Attendance.find(
      { date, email: { $in: emails } },
      { email: 1 }
    );
    const existingSet = new Set(existingDocs.map(r => r.email));

    let created = 0, updated = 0, skipped = 0;
    const ops = [];

    for (const emp of employees) {
      const email = normEmail(emp.email);
      const has = existingSet.has(email);

      // Default behaviour: don't touch people who already marked that day.
      if (has && !overwrite) {
        skipped++;
        continue;
      }

      if (has) updated++;
      else created++;

      ops.push({
        updateOne: {
          filter: { email, date },
          update: { $set: { name: emp.name, email, date, day, time, workTypes } },
          upsert: true
        }
      });
    }

    if (ops.length) await Attendance.bulkWrite(ops);

    res.json({
      success: true,
      total: employees.length,
      created,
      updated,
      skipped
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- GET MY OWN ----------------
// Any logged-in employee can read ONLY their own attendance records.
router.get("/mine", ensureAuth, async (req, res) => {
  try {
    const email = normEmail(req.user?.emails?.[0]?.value);
    const data = await Attendance.find({ email }).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- GET ALL (admin only) ----------------
// Locked to admins — this powers the admin dashboard. Regular employees
// must use /mine so they can never see other people's attendance.
router.get("/", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const { search = "", singleDate = "", fromDate = "", toDate = "", month = "", all = "" } = req.query;

    const q = {};

    // Date scope. Default to the current month so the dashboard stays fast as
    // history grows; `all=1` loads everything; a search with no date searches
    // all-time so you can find anyone.
    if (all !== "1") {
      if (fromDate && toDate) q.date = { $gte: fromDate, $lte: toDate };
      else if (singleDate) q.date = singleDate;
      else if (/^\d{4}-\d{2}$/.test(month)) q.date = { $gte: month + "-01", $lte: month + "-31" };
      else if (!search) {
        const m = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
        q.date = { $gte: m + "-01", $lte: m + "-31" };
      }
    }

    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      q.$or = [{ name: rx }, { email: rx }];
    }

    const data = await Attendance.find(q).sort({ date: -1 }).limit(2000);
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
    const recordDate = r.date;
    return recordDate >= fromDate && recordDate <= toDate;
  });

}

else if (singleDate) {

  records = records.filter(r => {
    const recordDate = r.date;
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
    const widths = [24, 32, 14, 12, 14, 34, 16, 20];
    widths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });

    const thin = { style: "thin", color: { argb: "FFD9E3EA" } };
    const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

    // ---- TITLE BANNER (row 1) ----
    worksheet.mergeCells("A1:H1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "TriVi Infracons  —  Attendance Report";
    titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2433" } };
    worksheet.getRow(1).height = 30;

    // ---- SUBTITLE (row 2) ----
    worksheet.mergeCells("A2:H2");
    const subCell = worksheet.getCell("A2");
    subCell.value =
      `Exported ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}   •   ${records.length} record(s)`;
    subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF5B6B76" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(2).height = 18;

    // ---- HEADER ROW (row 3) ----
    const headerRow = worksheet.getRow(3);
    headerRow.values = ["Name", "Email", "Date", "Day", "Time", "Work Type", "Image", "Location"];
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", bold: true, color: { argb: "FF3A2A08" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0A23C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll;
    });

    // ---- DATA ROWS (row 4 onward) ----
    records.forEach((item, idx) => {
      const hasLoc = item.location && item.location.lat != null && item.location.lng != null;
      const row = worksheet.addRow([
        item.name || "",
        item.email || "",
        item.date || "",
        item.day || "",
        item.time || "",
        (item.workTypes || []).join(", "),
        item.imageUrl ? "View Image" : "No Image",
        hasLoc ? "View Map" : ""
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

      // Clickable map link (Site Visit GPS proof)
      if (hasLoc) {
        const locCell = row.getCell(8);
        locCell.value = {
          text: "View Map",
          hyperlink: `https://www.google.com/maps?q=${item.location.lat},${item.location.lng}`
        };
        locCell.font = { name: "Calibri", color: { argb: "FF0A5C8A" }, underline: true };
      }
    });

    // Filter dropdowns on the header row
    worksheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 8 } };

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

// ---------------- MONTHLY SUMMARY (admin) ----------------
// Per-employee totals for a month (payroll-style). Includes everyone on the
// roster (0 if they marked nothing), plus anyone with records but not on it.
function monthSummaryRows(records, roster) {
  const map = {};
  roster.forEach(e => {
    const k = normEmail(e.email);
    map[k] = { name: e.name, email: e.email, days: 0, wfh: 0, office: 0, site: 0, leave: 0, govt: 0 };
  });
  records.forEach(r => {
    const k = normEmail(r.email);
    if (!map[k]) map[k] = { name: r.name || "—", email: r.email, days: 0, wfh: 0, office: 0, site: 0, leave: 0, govt: 0 };
    map[k].days++;
    (r.workTypes || []).forEach(t => {
      if (t.includes("Work From Home")) map[k].wfh++;
      else if (t.includes("Office")) map[k].office++;
      else if (t.includes("Site")) map[k].site++;
      else if (t.includes("Leave")) map[k].leave++;
      else if (t.includes("Government")) map[k].govt++;
    });
  });
  return Object.values(map).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

function resolveMonth(q) {
  if (/^\d{4}-\d{2}$/.test(q || "")) return q;
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
}

router.get("/summary", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const Employee = require("../models/Employee");
    const month = resolveMonth(req.query.month);
    const records = await Attendance.find({ date: { $gte: month + "-01", $lte: month + "-31" } });
    const roster = await Employee.find();
    res.json({ month, rows: monthSummaryRows(records, roster) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/summary/excel", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const Employee = require("../models/Employee");
    const month = resolveMonth(req.query.month);
    const records = await Attendance.find({ date: { $gte: month + "-01", $lte: month + "-31" } });
    const roster = await Employee.find();
    const rows = monthSummaryRows(records, roster);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TriVi Infracons";
    const ws = workbook.addWorksheet("Monthly Summary", { views: [{ state: "frozen", ySplit: 3 }] });

    const widths = [26, 32, 14, 10, 10, 10, 10, 14];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

    const thin = { style: "thin", color: { argb: "FFD9E3EA" } };
    const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

    ws.mergeCells("A1:H1");
    const title = ws.getCell("A1");
    title.value = `TriVi Infracons  —  Monthly Summary (${month})`;
    title.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    title.alignment = { vertical: "middle", horizontal: "center" };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B3A32" } };
    ws.getRow(1).height = 30;

    ws.mergeCells("A2:H2");
    const sub = ws.getCell("A2");
    sub.value = `Exported ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}   •   ${rows.length} employee(s)`;
    sub.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF5B6B76" } };
    sub.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(2).height = 18;

    const header = ws.getRow(3);
    header.values = ["Name", "Email", "Days Present", "WFH", "Office", "Site", "Leave", "Govt Holiday"];
    header.height = 22;
    header.eachCell(cell => {
      cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F5F50" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll;
    });

    rows.forEach((r, idx) => {
      const row = ws.addRow([r.name, r.email, r.days, r.wfh, r.office, r.site, r.leave, r.govt]);
      row.height = 20;
      const band = idx % 2 === 0 ? "FFFFFFFF" : "FFF1F7F5";
      row.eachCell(cell => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = borderAll;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: band } };
        cell.font = { name: "Calibri", color: { argb: "FF0C2B26" } };
      });
    });

    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 8 } };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=summary-${month}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- UPDATE ----------------
router.put("/:id", ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const workTypes = cleanWorkTypes(req.body.workTypes);

    if (workTypes.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Select at least one valid option"
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
      { new: true, runValidators: true }
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
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;