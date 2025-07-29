import config from '../utils/config.js';

// Authentication middleware - uses hardcoded token for POC
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token is required',
      message: 'Please provide a Bearer token in the Authorization header',
      timestamp: new Date().toISOString()
    });
  }

  // For POC, validate against hardcoded token
  if (token !== config.server.apiToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid access token',
      message: 'The provided token is not valid',
      timestamp: new Date().toISOString()
    });
  }

  // Token is valid, continue to next middleware
  next();
}

// Optional authentication middleware
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && token === config.server.apiToken) {
    req.authenticated = true;
  } else {
    req.authenticated = false;
  }

  next();
}