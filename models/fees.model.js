const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rollNo: { type: String, required: true },
    class: { type: String, required: true },
    section: { type: String, default: 'A' },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now },
});

const paymentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rollNo: { type: String, required: true },
    date: { type: Date, default: Date.now },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Completed', 'Failed'], default: 'Completed' },
    method: { type: String, required: true },
});

module.exports = {
    Fee: mongoose.model('Fee', feeSchema),
    Payment: mongoose.model('Payment', paymentSchema),
};