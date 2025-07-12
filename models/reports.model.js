const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Academic', 'Attendance'],
        required: true,
        trim: true,
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    student: {
        type: String,
        required: true,
        trim: true,
    },
    class: {
        type: String,
        required: true,
        trim: true,
        enum: [
            'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
            'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
        ],
    },
    subject: {
        type: String,
        trim: true,
        enum: [
            '', // Allow empty for Attendance reports
            'Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Computer Science',
        ],
    },
    marks: {
        type: Number,
        min: 0,
        max: 100,
    },
    attendance: {
        type: String,
        trim: true,
        match: /^$|^(100|[1-9]?[0-9])%?$/ // Allow empty or valid percentage (0-100%)
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

// Indexes for faster queries
reportSchema.index({ studentId: 1, class: 1, date: 1 });

module.exports = mongoose.model('Report', reportSchema);