const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const firebaseAdmin = require('../config/firebaseAdmin');
const { checkEnvironmentVariables } = require('../util/envChecker');

/**
 * GET /api/system/health
 * Check system health including database, Firebase and environment variables
 */
router.get('/health', (req, res) => {
  try {
    // Check environment variables
    const envStatus = checkEnvironmentVariables();
    
    // Check MongoDB connection
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Check Firebase status
    const firebaseStatus = {
      initialized: !!(firebaseAdmin && firebaseAdmin.apps && firebaseAdmin.apps.length > 0),
      appCount: firebaseAdmin && firebaseAdmin.apps ? firebaseAdmin.apps.length : 0
    };
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      environmentVariables: {
        status: envStatus.isValid ? 'valid' : 'invalid',
        missing: envStatus.missing,
        malformed: envStatus.malformed
      },
      mongoConnection: {
        state: connectionStates[connectionState] || 'unknown',
        readyState: connectionState
      },
      firebase: firebaseStatus
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error checking system health',
      error: error.message
    });
  }
});

module.exports = router;
