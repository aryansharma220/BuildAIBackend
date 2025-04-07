/**
 * Custom CORS middleware with better debugging and flexibility
 */
const corsMiddleware = (req, res, next) => {
  // Parse CORS_ORIGIN from env var to get an array of allowed origins
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [
        'https://build-ai-digest.vercel.app',
        'https://ai-digest.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ];
  
  // Special case for development/testing: allow all origins
  const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === 'true' || 
                         process.env.NODE_ENV === 'development';
  
  const origin = req.headers.origin;
  
  // Log the request for debugging
  console.log(`[CORS] Request from origin: ${origin || 'unknown'} to ${req.method} ${req.path}`);
  console.log(`[CORS] Allowed origins: ${allowAllOrigins ? 'ALL' : allowedOrigins.join(', ')}`);
  
  // Set CORS headers
  if (allowAllOrigins && origin) {
    // In development, allow any origin that's specified
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`[CORS] Allowed all origins in development mode: ${origin}`);
  } else if (origin && allowedOrigins.includes(origin)) {
    // Set the specific origin for allowed origins
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`[CORS] Explicitly allowed origin: ${origin}`);
  } else if (!origin) {
    // For requests with no origin header (like curl)
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log('[CORS] No origin header, allowed with wildcard');
  } else {
    // For blocked origins, we'll still proceed but log it
    console.log(`[CORS] Blocked origin: ${origin}`);
    // Don't set CORS headers for blocked origins
  }
  
  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Handling OPTIONS preflight request');
    res.status(204).end();
    return;
  }
  
  next();
};

module.exports = corsMiddleware;
