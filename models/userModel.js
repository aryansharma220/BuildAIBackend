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
    required: true
  },
  displayName: String,
  photoURL: String,
  preferences: {
    categories: [String], // Allow any string categories for flexibility
    digestFrequency: {
      type: String,
      default: 'daily'
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  },
  readHistory: [{
    digestId: String,
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
  strict: false // Allow fields not specified in schema
});

// Create index for faster queries
userSchema.index({ 'uid': 1 });

// Simple logging for debugging
userSchema.pre('save', function(next) {
  console.log(`Saving user with uid: ${this.uid}`);
  next();
});

userSchema.pre('findOneAndUpdate', function() {
  console.log(`Updating user: ${JSON.stringify(this.getQuery())}`);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
