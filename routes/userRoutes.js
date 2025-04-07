const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const mongoose = require('mongoose');

/**
 * GET /api/user/profile
 * Get user profile
 */
router.get('/profile', async (req, res) => {
  try {
    console.log('GET /api/user/profile called for uid:', req.user.uid);
    
    const user = await User.findOne({ uid: req.user.uid });
    
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      message: 'Error fetching user profile', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/user/profile
 * Create or update user profile
 */
router.post('/profile', async (req, res) => {
  try {
    console.log('POST /api/user/profile called for uid:', req.user.uid);
    console.log('Request body:', req.body);
    
    const { displayName, photoURL, preferences } = req.body;
    
    // Find user or create a new one
    let user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      console.log('Creating new user');
      // Create new user
      user = new User({
        uid: req.user.uid,
        email: req.user.email,
        displayName: displayName || '',
        photoURL: photoURL || '',
        preferences: preferences || {
          categories: [],
          digestFrequency: 'daily',
          notificationsEnabled: true
        }
      });
    } else {
      console.log('Updating existing user');
      // Update existing user
      if (displayName !== undefined) user.displayName = displayName;
      if (photoURL !== undefined) user.photoURL = photoURL;
      if (preferences) {
        user.preferences = {
          ...user.preferences,
          ...preferences
        };
      }
      user.lastLogin = new Date();
    }
    
    console.log('Saving user document');
    try {
      await user.save();
      console.log('User saved successfully');
    } catch (saveError) {
      console.error('Error saving user document:', saveError);
      return res.status(500).json({ 
        message: 'Error saving user document', 
        error: saveError.message 
      });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      message: 'Error updating user profile', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/user/preferences
 * Get user preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user.preferences || {});
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ 
      message: 'Error fetching user preferences', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
router.patch('/preferences', async (req, res) => {
  try {
    const { categories, digestFrequency, notificationsEnabled } = req.body;
    
    // Validate input data
    if (digestFrequency && !['daily', 'weekly'].includes(digestFrequency)) {
      return res.status(400).json({ message: 'Invalid digest frequency. Must be "daily" or "weekly"' });
    }
    
    const updateData = {};
    if (categories !== undefined) updateData['preferences.categories'] = categories;
    if (digestFrequency !== undefined) updateData['preferences.digestFrequency'] = digestFrequency;
    if (notificationsEnabled !== undefined) updateData['preferences.notificationsEnabled'] = notificationsEnabled;
    
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: updateData },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user.preferences);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ 
      message: 'Error updating user preferences', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/user/history
 * Get user's read history
 */
router.get('/history', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user.readHistory || []);
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ 
      message: 'Error fetching user history', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/user/history
 * Add digest to user's read history
 */
router.post('/history', async (req, res) => {
  try {
    const { digestId } = req.body;
    
    if (!digestId) {
      return res.status(400).json({ message: 'Digest ID is required' });
    }
    
    const updatedUser = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { 
        $push: { 
          readHistory: {
            digestId,
            readAt: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
    
    res.status(200).json(updatedUser.readHistory || []);
  } catch (error) {
    console.error('Error updating user history:', error);
    res.status(500).json({ 
      message: 'Error updating user history', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/user/debug
 * Debug endpoint to verify database connection and user collection access
 */
router.get('/debug', async (req, res) => {
  try {
    // Check MongoDB connection
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Check if we can list collections
    let collections = [];
    try {
      collections = await mongoose.connection.db.listCollections().toArray();
    } catch (err) {
      console.error('Error listing collections:', err);
    }
    
    // Check if we can count users
    let usersCount = 0;
    try {
      usersCount = await User.countDocuments();
    } catch (err) {
      console.error('Error counting users:', err);
    }
    
    // Return debug info
    res.status(200).json({
      mongoConnection: {
        state: connectionStates[connectionState],
        readyState: connectionState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      collections: collections.map(c => c.name),
      usersCollection: {
        exists: collections.some(c => c.name === 'users'),
        count: usersCount
      },
      user: req.user ? {
        uid: req.user.uid,
        email: req.user.email
      } : null
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({ 
      message: 'Database debug error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
