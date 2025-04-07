/**
 * Middleware to log all incoming requests
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log the request
  console.log(`REQUEST: ${req.method} ${req.originalUrl}`);
  
  // Log selected headers for debugging, especially auth-related
  const headers = {
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 
      `Bearer ${req.headers.authorization.split(' ')[1]?.substring(0, 10)}...` : 
      'none'
  };
  
  console.log(`HEADERS: ${JSON.stringify(headers)}`);
  
  // Log response when it completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`RESPONSE: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
  });
  
  next();
};

module.exports = requestLogger;
