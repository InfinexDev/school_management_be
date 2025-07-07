const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  parentName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  previousSchool: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Admission', admissionSchema);