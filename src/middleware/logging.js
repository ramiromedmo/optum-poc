import { v4 as uuidv4 } from 'uuid';

// Add correlation ID to requests for tracing
export function addCorrelationId(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
}

// Simple request logging middleware
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  console.log(`📥 [${req.correlationId}] ${req.method} ${req.path} - Request started`);
  
  // Log request body for POST/PUT requests (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    console.log(`📝 [${req.correlationId}] Request body:`, JSON.stringify(sanitizedBody, null, 2));
  }

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    console.log(`📤 [${req.correlationId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    
    // Log response body for errors or debug mode
    if (res.statusCode >= 400 || process.env.LOG_LEVEL === 'debug') {
      console.log(`📋 [${req.correlationId}] Response:`, JSON.stringify(body, null, 2));
    }
    
    return originalJson.call(this, body);
  };

  next();
}

// Sanitize request body by removing sensitive information
function sanitizeRequestBody(body) {
  const sensitiveFields = ['ssn', 'password', 'token', 'secret'];
  const sanitized = JSON.parse(JSON.stringify(body));
  
  function sanitizeObject(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '***REDACTED***';
      }
    }
  }
  
  sanitizeObject(sanitized);
  return sanitized;
}