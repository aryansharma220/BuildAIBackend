const mongoose = require('mongoose');

const digestSchema = new mongoose.Schema({
  content_id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    index: true
  },
  tags: [{
    type: String
  }],
  url: String,
  original_date: Date,
  date_created: {
    type: Date,
    default: Date.now,
    index: true
  },
  is_enhanced: {
    type: Boolean,
    default: false
  },
  enhanced_at: Date,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  collection: 'digests'
});

// Create compound index for efficient filtering
digestSchema.index({ category: 1, date_created: -1 });
digestSchema.index({ source: 1, date_created: -1 });

module.exports = mongoose.model('Digest', digestSchema);
