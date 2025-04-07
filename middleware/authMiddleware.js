const firebaseAdmin = require('../config/firebaseAdmin');

/**
 * Middleware to verify Firebase authentication token
 */
const authMiddleware = async (req, res, next) => {
  console.log('Auth middleware processing request to:', req.originalUrl);
  console.log('Headers present:', Object.keys(req.headers));
  console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');
  
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
    
    if (!authHeader) {
      console.log('Missing authorization header');
      return res.status(401).json({ message: 'Unauthorized: Missing authorization header' });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid token format:', authHeader.substring(0, 15) + '...');
      return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
    }
    
    const idToken = authHeader.split('Bearer ')[1].trim();
    
    if (!idToken || idToken === 'undefined' || idToken === 'null') {
      console.log('Empty or invalid token provided');
      return res.status(401).json({ message: 'Unauthorized: Empty token' });
    }
    
    console.log('Token received for verification, length:', idToken.length);
    
    // Extra safety check
    if (!firebaseAdmin.auth) {
      console.error('Firebase auth object is not available');
      return res.status(500).json({ message: 'Server configuration error: Firebase auth not available' });
    }
    
    try {
      // Verify the token
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
      
      if (!decodedToken || !decodedToken.uid) {
        console.error('Token decoded but no UID found');
        return res.status(401).json({ message: 'Unauthorized: Invalid token content' });
      }
      
      // Add user information to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name || ''
      };
      
      console.log(`Successfully authenticated user: ${req.user.email}`);
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
