/**
 * Utility to verify critical environment variables are properly set
 */
const checkEnvironmentVariables = () => {
  const criticalVars = [
    'MONGODB_URI',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];
  
  const missing = [];
  const malformed = [];
  
  criticalVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else if (varName === 'FIREBASE_PRIVATE_KEY') {
      // Check if the private key is properly formatted
      const key = process.env[varName];
      if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
        malformed.push(varName);
      }
    }
  });
  
  if (missing.length > 0) {
    console.error('CRITICAL: Missing environment variables:', missing.join(', '));
  }
  
  if (malformed.length > 0) {
    console.error('CRITICAL: Malformed environment variables:', malformed.join(', '));
  }
  
  return {
    isValid: missing.length === 0 && malformed.length === 0,
    missing,
    malformed
  };
};

module.exports = {
  checkEnvironmentVariables
};
