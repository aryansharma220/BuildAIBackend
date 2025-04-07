const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firestoreConfig');

// Collection name for users
const USERS_COLLECTION = 'users';

/**
 * GET /api/user/profile
 * Get user profile
 */
router.get('/profile', async (req, res) => {
  try {
    console.log('GET /api/user/profile called for uid:', req.user.uid);
    
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create a minimal user entry
      const userData = {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.displayName || '',
        lastLogin: new Date().toISOString(),
        preferences: {
          categories: [],
          digestFrequency: 'daily',
          notificationsEnabled: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        await userRef.set(userData);
        console.log('Created minimal user record for:', req.user.uid);
        
        // Return the newly created user data
        return res.status(200).json(userData);
      } catch (saveError) {
        console.error('Error saving new user to Firestore:', saveError);
        // We'll still return minimal data even if save fails
      }
    }
    
    // Get the user data
    const userData = userDoc.data();
    
    // Update last login time
    userRef.update({ lastLogin: new Date().toISOString() })
      .catch(err => console.error('Error updating last login:', err));
    
    // Return user data
    res.status(200).json({
      uid: req.user.uid,
      email: req.user.email,
      displayName: userData.displayName || '',
      preferences: userData.preferences || {
        categories: [],
        digestFrequency: 'daily',
        notificationsEnabled: true
      },
      lastLogin: new Date().toISOString()
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
    
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(req.user.uid);
    const userDoc = await userRef.get();
    
    // Update data with timestamp
    const updateData = {
      lastLogin: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (req.body.displayName) updateData.displayName = req.body.displayName;
    if (req.body.photoURL) updateData.photoURL = req.body.photoURL;
    
    if (userDoc.exists) {
      // Update existing user
      await userRef.update(updateData);
      const updatedDoc = await userRef.get();
      const userData = updatedDoc.data();
      
      res.status(200).json({
        uid: req.user.uid,
        email: req.user.email,
        displayName: userData.displayName || '',
        preferences: userData.preferences || {
          categories: [],
          digestFrequency: 'daily',
          notificationsEnabled: true
        }
      });
    } else {
      // Create a new user document
      const userData = {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.body.displayName || '',
        photoURL: req.body.photoURL || '',
        lastLogin: new Date().toISOString(),
        preferences: {
          categories: [],
          digestFrequency: 'daily',
          notificationsEnabled: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await userRef.set(userData);
      
      res.status(200).json(userData);
    }
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
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Return default preferences if user doesn't exist
      return res.status(200).json({
        categories: [],
        digestFrequency: 'daily',
        notificationsEnabled: true
      });
    }
    
    const userData = userDoc.data();
    
    // Return preferences with defaults if missing
    res.status(200).json(userData.preferences || {
      categories: [],
      digestFrequency: 'daily',
      notificationsEnabled: true
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(200).json({
      categories: [],
      digestFrequency: 'daily',
      notificationsEnabled: true
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
    
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing user's preferences
      await userRef.update({ 
        preferences,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create a new user with preferences
      await userRef.set({
        uid: req.user.uid,
        email: req.user.email,
        displayName: '',
        preferences,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    res.status(200).json(preferences);
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
 * POST /api/user/history
 * Add a digest to user's read history
 */
router.post('/history', async (req, res) => {
  try {
    const { digestId } = req.body;
    
    if (!digestId) {
      return res.status(400).json({ message: 'Digest ID is required' });
    }
    
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(req.user.uid);
    const userDoc = await userRef.get();
    
    // Current timestamp
    const readAt = new Date().toISOString();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      const history = userData.readHistory || [];
      
      // Add to history if not already present
      if (!history.some(item => item.digestId === digestId)) {
        history.push({ digestId, readAt });
        
        // Update the document
        await userRef.update({ 
          readHistory: history,
          updatedAt: new Date().toISOString()
        });
      }
      
      res.status(200).json({ 
        message: 'Read history updated',
        history 
      });
    } else {
      // Create a new user with read history
      const newUser = {
        uid: req.user.uid,
        email: req.user.email,
        readHistory: [{ digestId, readAt }],
        preferences: {
          categories: [],
          digestFrequency: 'daily',
          notificationsEnabled: true
        },
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await userRef.set(newUser);
      
      res.status(200).json({ 
        message: 'Read history created',
        history: newUser.readHistory 
      });
    }
  } catch (error) {
    console.error('Error updating read history:', error);
    res.status(500).json({ message: 'Failed to update read history' });
  }
});

/**
 * GET /api/user/history
 * Get user's read history
 */
router.get('/history', async (req, res) => {
  try {
    const db = getFirestore();
    const userRef = db.collection(USERS_COLLECTION).doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(200).json({ history: [] });
    }
    
    const userData = userDoc.data();
    const history = userData.readHistory || [];
    
    res.status(200).json({ history });
  } catch (error) {
    console.error('Error fetching read history:', error);
    res.status(500).json({ message: 'Failed to fetch read history', history: [] });
  }
});

module.exports = router;
