const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');
const firebaseAdmin = require('../config/firebaseAdmin');

/**
 * POST /api/auth/verify
 * Verify authentication token and return user data
 */
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    console.log('Verifying user authentication with uid:', req.user.uid);
    
    // Token is valid if middleware passed
    // Find or create user in database
    let user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      console.log('User not found. Creating new user profile.');
      // Create basic user profile
      user = new User({
        uid: req.user.uid,
        email: req.user.email,
        displayName: '',
        lastLogin: new Date()
      });
      
      try {
        await user.save();
        console.log('New user created successfully.');
      } catch (saveError) {
        console.error('Error creating new user:', saveError);
        return res.status(500).json({ 
          message: 'Error creating user profile', 
          error: saveError.message 
        });
      }
    } else {
      console.log('User found. Updating last login time.');
      // Update last login
      try {
        await User.updateOne(
          { uid: req.user.uid },
          { $set: { lastLogin: new Date() }}
        );
        console.log('Last login updated successfully.');
      } catch (updateError) {
        console.error('Error updating last login:', updateError);
      }
    }
    
    res.status(200).json({
      message: 'Authentication successful',
      user: {
        uid: req.user.uid,
        email: req.user.email,
        emailVerified: req.user.emailVerified
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ 
      message: 'Authentication verification failed', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

/**
 * POST /api/auth/token-debug
 * Debug endpoint to check token validity
 */
router.post('/token-debug', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
    
    console.log('Received token for debugging:', token.substring(0, 10) + '...');
    
    // Check if Firebase is initialized
    if (!firebaseAdmin || !firebaseAdmin.apps || !firebaseAdmin.apps.length) {
      return res.status(500).json({ 
        message: 'Firebase Admin SDK not initialized',
        firebaseStatus: {
          initialized: false,
          apps: firebaseAdmin ? (firebaseAdmin.apps ? firebaseAdmin.apps.length : 'no apps property') : 'null'
        }
      });
    }
    
    // Try to decode without verification (just to check format)
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = JSON.parse(Buffer.from(base64, 'base64').toString());
      
      const now = Math.floor(Date.now() / 1000);
      const tokenStatus = {
        formatted: true,
        expired: decodedPayload.exp < now,
        timeRemaining: decodedPayload.exp - now,
        issuer: decodedPayload.iss,
        audience: decodedPayload.aud,
        subject: decodedPayload.sub
      };
      
      // Now try to verify with Firebase
      try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
        return res.status(200).json({ 
          message: 'Token is valid',
          tokenStatus,
          verified: true,
          decodedData: {
            uid: decodedToken.uid,
            email: decodedToken.email
          }
        });
      } catch (verifyError) {
        return res.status(200).json({ 
          message: 'Token format is valid but verification failed',
          tokenStatus,
          verified: false,
          verifyError: {
            code: verifyError.code,
            message: verifyError.message
          }
        });
      }
    } catch (parseError) {
      return res.status(400).json({ 
        message: 'Invalid token format',
        error: parseError.message
      });
    }
  } catch (error) {
    console.error('Token debug error:', error);
    res.status(500).json({ message: 'Error processing token', error: error.message });
  }
});

/**
 * GET /api/auth/firebase-status
 * Check Firebase initialization status
 */
router.get('/firebase-status', (req, res) => {
  try {
    const status = {
      initialized: !!(firebaseAdmin && firebaseAdmin.apps && firebaseAdmin.apps.length > 0),
      appCount: firebaseAdmin && firebaseAdmin.apps ? firebaseAdmin.apps.length : 0,
      environmentVars: {
        projectId: !!process.env.FIREBASE_PROJECT_ID,
        clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: !!(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.length > 0)
      }
    };
    
    res.status(200).json({
      message: status.initialized ? 'Firebase Admin SDK initialized' : 'Firebase Admin SDK not initialized',
      status
    });
  } catch (error) {
    console.error('Error checking Firebase status:', error);
    res.status(500).json({ message: 'Error checking Firebase status', error: error.message });
  }
});

module.exports = router;
