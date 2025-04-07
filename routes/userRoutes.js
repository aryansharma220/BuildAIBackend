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
    
    // Find or create a basic user entry
    let user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      // Create a minimal user entry
      user = new User({
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.displayName || '',
        lastLogin: new Date(),
        preferences: {
          categories: [],
          digestFrequency: 'daily',
          notificationsEnabled: true
        }
      });
      
      try {
        await user.save();
        console.log('Created minimal user record for:', req.user.uid);
      } catch (saveError) {
        console.error('Error saving new user:', saveError);
        // We'll still return some data even if save fails
      }
    }
    
    // Return user data (either from DB or newly created)
    res.status(200).json({
      uid: req.user.uid,
      email: req.user.email,
      displayName: user.displayName || '',
      preferences: user.preferences || {
        categories: [],
        digestFrequency: 'daily',
        notificationsEnabled: true
      },
      lastLogin: new Date()
    });
  } catch (error) {
    console.error('Error handling user profile:', error);
    
    // Return minimal data even on error
    res.status(200).json({
      uid: req.user.uid,
      email: req.user.email,
      displayName: '',
      preferences: {
        categories: [],
        digestFrequency: 'daily',
        notificationsEnabled: true
      }
    });
  }
});

/**
 * POST /api/user/profile
 * Update basic user data
 */
router.post('/profile', async (req, res) => {
  try {
    console.log('POST /api/user/profile called for uid:', req.user.uid);
    
    // Only update; don't create a full profile
    const updateData = {
      lastLogin: new Date()
    };
    
    if (req.body.displayName) updateData.displayName = req.body.displayName;
    if (req.body.photoURL) updateData.photoURL = req.body.photoURL;
    
    // Find and update or create minimal record
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: updateData },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    
    res.status(200).json({
      uid: req.user.uid,
      email: req.user.email,
      displayName: user.displayName || '',
      preferences: user.preferences || {
        categories: [],
        digestFrequency: 'daily',
        notificationsEnabled: true
      }
    });
  } catch (error) {
    console.error('Error updating basic user data:', error);
    res.status(200).json({
      uid: req.user.uid,
      email: req.user.email,
      message: 'Profile update attempted but encountered an error'
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
 * POST /api/user/preferences
 * Update user preferences
 */
router.post('/preferences', async (req, res) => {
  try {
    console.log('POST /api/user/preferences called for uid:', req.user.uid);
    console.log('Received preferences:', req.body);
    
    const { categories, digestFrequency, notificationsEnabled } = req.body;
    
    // Build the preferences object with defaults
    const preferences = {
      categories: categories || [],
      digestFrequency: digestFrequency || 'daily',
      notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true
    };
    
    // Find and update the user's preferences, creating a minimal record if needed
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { 
        $set: { 
          preferences,
          email: req.user.email, // Ensure we have this basic info
          lastLogin: new Date()
        }
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    
    res.status(200).json(user.preferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(200).json({
      message: 'Preferences update received but encountered an error',
      categories: req.body.categories || [],
      digestFrequency: req.body.digestFrequency || 'daily',
      notificationsEnabled: req.body.notificationsEnabled !== undefined 
        ? req.body.notificationsEnabled 
        : true
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
