const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    class: { type: String, required: true },
    status: { type: String, enum: ['Present', 'Absent'], required: true },
    date: { type: Date, required: true },
});

module.exports = mongoose.model('Attendance', attendanceSchema);