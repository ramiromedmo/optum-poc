import ServiceTypeManager from '../services/ServiceTypeManager.js';
import EligibilityService from '../services/EligibilityService.js';
import { v4 as uuidv4 } from 'uuid';

class EligibilityController {
  constructor() {
    this.serviceTypeManager = new ServiceTypeManager();
    this.eligibilityService = new EligibilityService();
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'optum-eligibility-poc',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      };

      res.status(200).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }



  // Get all available service types
  async getServiceTypes(req, res) {
    try {
      const correlationId = req.headers['x-correlation-id'] || uuidv4();

      console.log(`📋 [${correlationId}] Getting service types`);

      const serviceTypes = this.serviceTypeManager.getAllServiceTypes();

      res.status(200).json({
        success: true,
        data: serviceTypes,
        count: Object.keys(serviceTypes).length,
        correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error getting service types:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service types',
        correlationId: req.headers['x-correlation-id'] || uuidv4(),
        timestamp: new Date().toISOString()
      });
    }
  }



  // Check eligibility (main endpoint)
  async checkEligibility(req, res) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    const startTime = Date.now();

    try {
      console.log(`🏥 [${correlationId}] Starting eligibility check`);

      // Use the EligibilityService to check eligibility
      const eligibilityResponse = await this.eligibilityService.checkEligibility(req.body, correlationId);

      const duration = Date.now() - startTime;
      console.log(`✅ [${correlationId}] Eligibility check completed in ${duration}ms`);

      res.status(200).json({
        success: true,
        data: eligibilityResponse,
        correlationId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [${correlationId}] Eligibility check failed after ${duration}ms:`, error.message);

      // Determine appropriate status code based on error type
      let statusCode = 500;
      if (error.message.includes('validation failed') || error.message.includes('Invalid service type')) {
        statusCode = 400;
      } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        statusCode = 401;
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        statusCode = 429;
      }

      res.status(statusCode).json({
        success: false,
        error: error.message,
        correlationId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }


}

export default EligibilityController;