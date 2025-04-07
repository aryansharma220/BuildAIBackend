const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  displayName: String,
  photoURL: String,
  preferences: {
    categories: [{
      type: String,
      enum: ['llm', 'computer_vision', 'reinforcement_learning', 'nlp', 'mlops', 'multimodal', 'research', 'ai_tools']
    }],
    digestFrequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily'
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  },
  readHistory: [{
    digestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Digest'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'users',
  strict: false // Allow fields not specified in schema temporarily for debugging
});

// Create index for faster queries
userSchema.index({ 'uid': 1 });
userSchema.index({ 'preferences.categories': 1 });
userSchema.index({ 'readHistory.digestId': 1 });

// Add a pre-save hook for logging
userSchema.pre('save', function(next) {
  console.log(`Saving user with uid: ${this.uid}, email: ${this.email}`);
  next();
});

// Add pre-findOne hook
userSchema.pre('findOne', function() {
  console.log(`Finding user with criteria: ${JSON.stringify(this.getQuery())}`);
});

// Add pre-findOneAndUpdate hook
userSchema.pre('findOneAndUpdate', function() {
  console.log(`Updating user with criteria: ${JSON.stringify(this.getQuery())}`);
  console.log(`Update data: ${JSON.stringify(this.getUpdate())}`);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
