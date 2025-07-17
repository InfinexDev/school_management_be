const mongoose = require('mongoose');

const scheduledTopicSchema = new mongoose.Schema({
  class: { type: String, required: true },
  section: { type: String, required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  date: { type: Date, required: true },
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('ScheduledTopic', scheduledTopicSchema);