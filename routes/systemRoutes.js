const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const firebaseAdmin = require('../config/firebaseAdmin');

/**
 * GET /api/system/health
 * System health check endpoint
 */
router.get('/health', (req, res) => {
  const mongoConnectionState = mongoose.connection.readyState;
  const mongoStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  }[mongoConnectionState] || 'unknown';

  // Check if Firebase Admin is properly initialized
  const firebaseInitialized = !!(firebaseAdmin && firebaseAdmin.apps && firebaseAdmin.apps.length);

  // Build environment information
  const environment = {
    nodeEnv: process.env.NODE_ENV || 'not set',
    allowedOrigins: process.env.CORS_ORIGIN || 'default origins',
    port: process.env.PORT || '5000 (default)',
    mongoDbName: process.env.DB_NAME || 'aidigest (default)',
    // Don't include sensitive info like connection strings!
  };

  // Get the origin for the current request
  const requestOrigin = req.headers.origin || 'No origin header';

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: mongoStatus,
      connectionState: mongoConnectionState
    },
    firebase: {
      initialized: firebaseInitialized,
      appCount: firebaseAdmin?.apps?.length || 0
    },
    environment,
    clientInfo: {
      ip: req.ip,
      origin: requestOrigin,
      userAgent: req.headers['user-agent'] || 'No user-agent header'
    },
    cors: {
      originHeader: requestOrigin,
      allowOriginSent: res.getHeader('Access-Control-Allow-Origin') || 'Not set',
      allowCredentialsSent: res.getHeader('Access-Control-Allow-Credentials') || 'Not set'
    }
  });
});

/**
 * GET /api/system/cors-test
 * Test CORS functionality
 */
router.get('/cors-test', (req, res) => {
  res.status(200).json({
    message: 'CORS is working properly',
    corsHeaders: {
      allowOrigin: res.getHeader('Access-Control-Allow-Origin') || 'Not set',
      allowMethods: res.getHeader('Access-Control-Allow-Methods') || 'Not set',
      allowHeaders: res.getHeader('Access-Control-Allow-Headers') || 'Not set',
      allowCredentials: res.getHeader('Access-Control-Allow-Credentials') || 'Not set'
    },
    requestInfo: {
      origin: req.headers.origin || 'No origin header',
      method: req.method,
      path: req.path,
      headers: {
        host: req.headers.host,
        referer: req.headers.referer || 'No referer',
        userAgent: req.headers['user-agent']
      }
    }
  });
});

/**
 * GET /api/system/db-test
 * Test database connectivity
 */
router.get('/db-test', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Try to access the User collection
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    
    res.status(200).json({
      message: 'Database connection test successful',
      database: {
        connectionState: mongoose.connection.readyState,
        name: mongoose.connection.db.databaseName,
        collections: collectionNames,
        userCount
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database connection test failed',
      error: error.message,
      mongoState: mongoose.connection.readyState
    });
  }
});

module.exports = router;
