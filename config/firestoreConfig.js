const admin = require('firebase-admin');

// Initialize Firestore
const initializeFirestore = () => {
  try {
    // Firestore is part of the same Firebase admin initialization
    const db = admin.firestore();
    
    // Set timestamp settings
    db.settings({ timestampsInSnapshots: true });
    
    console.log('Firestore initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    throw error;
  }
};

// Get Firestore instance, initializing if necessary
const getFirestore = () => {
  if (!admin.apps.length) {
    console.error('Firebase Admin SDK must be initialized before accessing Firestore');
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  return admin.firestore();
};

module.exports = {
  initializeFirestore,
  getFirestore
};
