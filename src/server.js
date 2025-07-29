import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import configuration and middleware
import config from './utils/config.js';
import { addCorrelationId, requestLogger } from './middleware/logging.js';
import { validateCorrelationId, validateRequestSize } from './middleware/validation.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';
import { specs, swaggerUi } from './config/swagger.js';

// Import routes
import eligibilityRoutes from './routes/eligibility.js';

// Initialize Express app
const app = express();

// Print configuration summary
config.printSummary();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Correlation-ID']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware with error handling
app.use(express.json({ 
    limit: '1mb',
    type: 'application/json',
    strict: true
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb',
    type: 'application/x-www-form-urlencoded'
}));

// Request processing middleware
app.use(addCorrelationId);
app.use(validateCorrelationId);
app.use(validateRequestSize(1024)); // 1MB limit

// Logging middleware
if (config.logging.enableRequestLogging) {
  app.use(requestLogger);
}

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Optum Eligibility API POC',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
}));

// API routes
app.use('/', eligibilityRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Optum Eligibility API POC',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      eligibility: '/eligibility',
      serviceTypes: '/service-types'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Optum Eligibility POC server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏥 Eligibility endpoint: http://localhost:${PORT}/eligibility`);
  console.log(`📋 Service types: http://localhost:${PORT}/service-types`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔧 Environment: ${config.server.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;