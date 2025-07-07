const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: { type: String, enum: ['Academic', 'Attendance'], required: true },
  student: { type: String, required: true },
  class: { type: String, required: true },
  subject: { type: String },
  marks: { type: Number },
  attendance: { type: String },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', reportSchema);