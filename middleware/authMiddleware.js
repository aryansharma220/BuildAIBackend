const firebaseAdmin = require('../config/firebaseAdmin');

/**
 * Middleware to verify Firebase authentication token
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Check if Firebase is initialized properly
    const isFirebaseReady = firebaseAdmin && firebaseAdmin.apps && firebaseAdmin.apps.length;
    
    if (!isFirebaseReady) {
      console.error('Firebase Admin SDK not initialized in auth middleware');
      return res.status(500).json({ 
        message: 'Server configuration error: Firebase not initialized'
      });
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid token format:', authHeader);
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format' });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken || idToken === 'undefined' || idToken === 'null') {
      console.log('Empty or invalid token:', idToken);
      return res.status(401).json({ message: 'Unauthorized: Empty token' });
    }
    
    // Extra safety check
    if (!firebaseAdmin.auth) {
      console.error('Firebase auth object is not available');
      return res.status(500).json({ message: 'Server configuration error: Firebase auth not available' });
    }
    
    try {
      // Verify the token
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
      
      // Add user information to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
      
      console.log(`Authenticated user: ${req.user.email}`);
      next();
    } catch (verifyError) {
      console.error('Token verification error:', verifyError);
      
      // Return detailed error info to help debug
      return res.status(401).json({ 
        message: 'Unauthorized: Invalid token', 
        error: verifyError.message,
        code: verifyError.code || 'unknown'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Unauthorized: Authentication processing error', error: error.message });
  }
};

module.exports = authMiddleware;
