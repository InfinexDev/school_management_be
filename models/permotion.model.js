const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    type: { type: String, enum: ['Video', 'Image', 'PDF'], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    fileUrl: { type: String, required: true }, // URL to uploaded file
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Promotion', promotionSchema);