const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true, trim: true },
  rollNo: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 1 },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['Completed', 'Failed'], default: 'Completed' },
  method: { type: String, required: true },
});

module.exports = mongoose.model('Payment', paymentSchema);