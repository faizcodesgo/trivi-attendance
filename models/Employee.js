const mongoose = require("mongoose");

// A simple, admin-managed roster of employees. Used by the "mark everyone"
// bulk feature so an admin can mark attendance for the whole team at once
// (e.g. a government holiday). Email is the unique key.
const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Employee", employeeSchema);
