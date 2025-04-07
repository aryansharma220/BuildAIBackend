/**
 * Custom CORS middleware with better debugging and flexibility
 */
const corsMiddleware = (req, res, next) => {
  // Parse CORS_ORIGIN from env var to get an array of allowed origins
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['https://build-ai-digest.vercel.app', 'http://localhost:3000', 'http://localhost:5173'];
  
  const origin = req.headers.origin;
  
  // Set CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    // Set the specific origin instead of wildcard when credentials are used
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`Allowed CORS for: ${origin}`);
  } else if (!origin) {
    // For requests without origin, we can use wildcard
    // But note that credentials won't work with wildcard
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    console.log(`Blocked CORS for: ${origin}`);
    // Don't set any CORS headers for blocked origins
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.status(204).end();
    return;
  }
  
  next();
};

module.exports = corsMiddleware;
