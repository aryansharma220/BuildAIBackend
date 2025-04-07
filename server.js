// Load environment variables first, before any imports
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Debug environment variables
console.log("======== ENVIRONMENT VARIABLES CHECK ========");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL exists:", !!process.env.FIREBASE_CLIENT_EMAIL);
console.log("FIREBASE_PRIVATE_KEY exists:", !!process.env.FIREBASE_PRIVATE_KEY);
console.log("FIREBASE_PRIVATE_KEY length:", process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0);
console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN);
console.log("============================================");

// Check for .env file existence
const envPath = path.join(__dirname, '.env');
console.log(`.env file exists: ${fs.existsSync(envPath)}`);

// Initialize Firebase early
console.log("Initializing Firebase Admin SDK...");
const firebaseAdmin = require('./config/firebaseAdmin');
console.log("Firebase Admin module loaded:", !!firebaseAdmin);
console.log("Firebase Admin apps:", firebaseAdmin && firebaseAdmin.apps ? firebaseAdmin.apps.length : 0);

if (!firebaseAdmin) {
  console.error('Failed to initialize Firebase Admin SDK. Server may not function correctly.');
}

// Now import modules that depend on environment variables
const express = require('express');
const corsMiddleware = require('./middleware/corsMiddleware');
const digestRoutes = require('./routes/digestRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const systemRoutes = require('./routes/systemRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const securityHeaders = require('./middleware/securityHeaders');
const requestLogger = require('./middleware/requestLoggerMiddleware');
const { checkEnvironmentVariables } = require('./util/envChecker');

// Check environment variables at startup
const envStatus = checkEnvironmentVariables();
if (!envStatus.isValid) {
  console.warn('Server starting with invalid environment configuration');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Apply request logger middleware first to log all requests
app.use(requestLogger);

// Apply our custom CORS middleware
app.use(corsMiddleware);

// Apply security headers middleware
app.use(securityHeaders);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/system', systemRoutes); // Unprotected system routes
app.use('/api/digests', digestRoutes);
app.use('/api/user', authMiddleware, userRoutes); // Protected routes
app.use('/api/auth', authRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    firestore: firebaseAdmin && firebaseAdmin.apps.length > 0 ? 'connected' : 'not connected'
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'API server is running' });
});

// 404 handler - place this AFTER all defined routes but BEFORE error handler
app.use((req, res, next) => {
  console.log(`404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;