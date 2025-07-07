const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    type: { type: String, enum: ['SMS', 'Email', 'WhatsApp'], required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    recipients: { type: String, required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);