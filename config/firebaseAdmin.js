const admin = require('firebase-admin');
const { initializeFirestore } = require('./firestoreConfig');

// Function to initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length) {
      console.log('Firebase Admin SDK already initialized');
      return admin;
    }
    
    let config;
    
    // Check if we're using environment variables or service account JSON
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Initialize with environment variables
      config = {
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      };
      
      console.log('Initializing Firebase Admin SDK with environment variables');
    } else {
      // Try to use local service account file (for development)
      try {
        const serviceAccount = require('../service-account.json');
        config = {
          credential: admin.credential.cert(serviceAccount)
        };
        console.log('Initializing Firebase Admin SDK with service account file');
      } catch (err) {
        console.error('Failed to load service account file, and no environment variables set:', err);
        throw new Error('Firebase Admin SDK initialization failed: No valid credentials');
      }
    }
    
    // Initialize the app
    admin.initializeApp(config);
    console.log('Firebase Admin SDK initialized successfully');
    
    // Initialize Firestore
    initializeFirestore();
    
    return admin;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

// Initialize Firebase Admin at module load time
try {
  initializeFirebaseAdmin();
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK at startup:', error);
}

module.exports = admin;
