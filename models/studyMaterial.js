const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  class: { type: String, required: true },
  subject: { type: String, required: true },
  type: { type: String, enum: ['PDF', 'Video', 'Assignment'], required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);