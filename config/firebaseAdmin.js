const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    console.log('Initializing Firebase Admin SDK with env vars');
    
    // Check for required variables
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.error('Missing FIREBASE_PROJECT_ID environment variable!');
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      console.error('Missing FIREBASE_CLIENT_EMAIL environment variable!');
    }
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      console.error('Missing FIREBASE_PRIVATE_KEY environment variable!');
    }
    
    // Always attempt to initialize - even with partial config
    try {
      // Safely handle environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : '';
      
      // Log the first few characters of private key to verify it's loaded correctly
      if (privateKey) {
        console.log('Private key starts with:', privateKey.substring(0, 20) + '...');
      } else {
        console.error('FIREBASE_PRIVATE_KEY is empty or undefined');
      }
      
      // Initialize the app with whatever credentials are available
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'dummy-project-id',
          privateKey: privateKey || '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'example@firebase.com'
        })
      });
      
      console.log('Firebase Admin SDK initialized successfully');
      return admin;
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      console.error('Error details:', error.stack);
      
      // Try alternative initialization with direct JSON if available
      try {
        console.log('Attempting alternative initialization...');
        admin.initializeApp();
        console.log('Firebase Admin SDK initialized via default credentials');
        return admin;
      } catch (altError) {
        console.error('Alternative initialization also failed:', altError.message);
        // Return admin anyway to prevent null issues
        return admin;
      }
    }
  } else {
    console.log('Firebase Admin SDK already initialized');
    return admin;
  }
};

// Initialize on module import
const firebaseAdmin = initializeFirebaseAdmin();

module.exports = firebaseAdmin;
