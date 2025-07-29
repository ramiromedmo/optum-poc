import CircuitBreaker from 'opossum';
import { defaultRetryHandler } from './retryHandler.js';

/**
 * CircuitBreakerManager creates and manages circuit breakers for different services
 * Integrates with retry logic for comprehensive resilience
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.stats = new Map();
  }

  /**
   * Create a circuit breaker for a specific service
   * @param {string} name - Unique name for the circuit breaker
   * @param {Object} options - Circuit breaker configuration
   * @returns {CircuitBreaker} Configured circuit breaker
   */
  createBreaker(name, options = {}) {
    if (this.breakers.has(name)) {
      return this.breakers.get(name);
    }

    const defaultOptions = {
      timeout: 30000, // 30 seconds
      errorThresholdPercentage: 50, // Open circuit at 50% error rate
      resetTimeout: 60000, // Try again after 60 seconds
      rollingCountTimeout: 10000, // 10 second rolling window
      rollingCountBuckets: 10, // 10 buckets in rolling window
      name: name,
      group: 'optum-api'
    };

    const config = { ...defaultOptions, ...options };
    
    // Create the circuit breaker
    const breaker = new CircuitBreaker(this.createBreakerFunction(name), config);
    
    // Set up event listeners for monitoring
    this.setupEventListeners(breaker, name);
    
    // Store the breaker
    this.breakers.set(name, breaker);
    this.stats.set(name, {
      created: new Date().toISOString(),
      config: config,
      events: []
    });

    console.log(`🔌 Circuit breaker '${name}' created with config:`, config);
    return breaker;
  }

  /**
   * Create the function that the circuit breaker will wrap
   * @param {string} name - Circuit breaker name
   * @returns {Function} Function to be wrapped by circuit breaker
   */
  createBreakerFunction(name) {
    return async (fn, operationName, correlationId, retryHandler = defaultRetryHandler) => {
      // The circuit breaker wraps the retry logic
      return retryHandler.execute(fn, operationName, correlationId);
    };
  }

  /**
   * Set up event listeners for circuit breaker monitoring
   * @param {CircuitBreaker} breaker - Circuit breaker instance
   * @param {string} name - Circuit breaker name
   */
  setupEventListeners(breaker, name) {
    const stats = this.stats.get(name);

    breaker.on('open', () => {
      const event = { type: 'open', timestamp: new Date().toISOString() };
      stats.events.push(event);
      console.log(`🔴 [${name}] Circuit breaker OPENED - failing fast`);
    });

    breaker.on('halfOpen', () => {
      const event = { type: 'halfOpen', timestamp: new Date().toISOString() };
      stats.events.push(event);
      console.log(`🟡 [${name}] Circuit breaker HALF-OPEN - testing service`);
    });

    breaker.on('close', () => {
      const event = { type: 'close', timestamp: new Date().toISOString() };
      stats.events.push(event);
      console.log(`🟢 [${name}] Circuit breaker CLOSED - service healthy`);
    });

    breaker.on('success', (result) => {
      console.log(`✅ [${name}] Circuit breaker - operation succeeded`);
    });

    breaker.on('failure', (error) => {
      console.log(`❌ [${name}] Circuit breaker - operation failed: ${error.message}`);
    });

    breaker.on('timeout', () => {
      const event = { type: 'timeout', timestamp: new Date().toISOString() };
      stats.events.push(event);
      console.log(`⏰ [${name}] Circuit breaker - operation timed out`);
    });

    breaker.on('reject', () => {
      const event = { type: 'reject', timestamp: new Date().toISOString() };
      stats.events.push(event);
      console.log(`🚫 [${name}] Circuit breaker - operation rejected (circuit open)`);
    });

    breaker.on('fallback', (result) => {
      const event = { type: 'fallback', timestamp: new Date().toISOString() };
      stats.events.push(event);
      console.log(`🔄 [${name}] Circuit breaker - fallback executed`);
    });
  }

  /**
   * Execute a function through a circuit breaker
   * @param {string} breakerName - Name of the circuit breaker to use
   * @param {Function} fn - Function to execute
   * @param {string} operationName - Name of the operation for logging
   * @param {string} correlationId - Request correlation ID
   * @param {Object} retryHandler - Retry handler to use (optional)
   * @returns {Promise} Result of the function execution
   */
  async execute(breakerName, fn, operationName, correlationId, retryHandler) {
    const breaker = this.breakers.get(breakerName);
    if (!breaker) {
      throw new Error(`Circuit breaker '${breakerName}' not found`);
    }

    try {
      return await breaker.fire(fn, operationName, correlationId, retryHandler);
    } catch (error) {
      // Check if this is a circuit breaker rejection
      if (error.message && error.message.includes('Breaker is open')) {
        throw new Error(`Service '${breakerName}' is currently unavailable (circuit breaker open)`);
      }
      throw error;
    }
  }

  /**
   * Get circuit breaker by name
   * @param {string} name - Circuit breaker name
   * @returns {CircuitBreaker|null} Circuit breaker instance or null
   */
  getBreaker(name) {
    return this.breakers.get(name) || null;
  }

  /**
   * Get all circuit breaker names
   * @returns {string[]} Array of circuit breaker names
   */
  getBreakerNames() {
    return Array.from(this.breakers.keys());
  }

  /**
   * Get circuit breaker statistics
   * @param {string} name - Circuit breaker name
   * @returns {Object} Statistics object
   */
  getStats(name) {
    const breaker = this.breakers.get(name);
    const stats = this.stats.get(name);
    
    if (!breaker || !stats) {
      return null;
    }

    return {
      name: name,
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      config: stats.config,
      metrics: {
        requests: breaker.stats.requests,
        successes: breaker.stats.successes,
        failures: breaker.stats.failures,
        rejects: breaker.stats.rejects,
        timeouts: breaker.stats.timeouts,
        fallbacks: breaker.stats.fallbacks,
        latencyMean: breaker.stats.latencyMean,
        percentiles: breaker.stats.percentiles
      },
      events: stats.events.slice(-10), // Last 10 events
      created: stats.created,
      lastActivity: new Date().toISOString()
    };
  }

  /**
   * Get statistics for all circuit breakers
   * @returns {Object} All circuit breaker statistics
   */
  getAllStats() {
    const allStats = {};
    for (const name of this.breakers.keys()) {
      allStats[name] = this.getStats(name);
    }
    return allStats;
  }

  /**
   * Reset circuit breaker statistics
   * @param {string} name - Circuit breaker name
   */
  resetStats(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.stats.reset();
      console.log(`📊 [${name}] Circuit breaker statistics reset`);
    }
  }

  /**
   * Manually open a circuit breaker (for testing)
   * @param {string} name - Circuit breaker name
   */
  openBreaker(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.open();
      console.log(`🔴 [${name}] Circuit breaker manually opened`);
    }
  }

  /**
   * Manually close a circuit breaker (for testing)
   * @param {string} name - Circuit breaker name
   */
  closeBreaker(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.close();
      console.log(`🟢 [${name}] Circuit breaker manually closed`);
    }
  }

  /**
   * Health check for all circuit breakers
   * @returns {Object} Health status
   */
  healthCheck() {
    const health = {
      status: 'healthy',
      circuitBreakers: {},
      summary: {
        total: this.breakers.size,
        open: 0,
        halfOpen: 0,
        closed: 0
      },
      timestamp: new Date().toISOString()
    };

    for (const [name, breaker] of this.breakers) {
      const state = breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed';
      
      health.circuitBreakers[name] = {
        state: state,
        healthy: state === 'closed',
        requests: breaker.stats.requests,
        failures: breaker.stats.failures,
        successRate: breaker.stats.requests > 0 ? 
          ((breaker.stats.successes / breaker.stats.requests) * 100).toFixed(2) + '%' : 'N/A'
      };

      // Update summary
      if (state === 'open') health.summary.open++;
      else if (state === 'half-open') health.summary.halfOpen++;
      else health.summary.closed++;
    }

    // Overall health status
    if (health.summary.open > 0) {
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdown() {
    for (const [name, breaker] of this.breakers) {
      breaker.shutdown();
      console.log(`🔌 [${name}] Circuit breaker shutdown`);
    }
    this.breakers.clear();
    this.stats.clear();
  }
}

// Create singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

// Pre-configured circuit breakers for common services
export const optumAuthBreaker = circuitBreakerManager.createBreaker('optum-auth', {
  timeout: 15000, // Shorter timeout for auth
  errorThresholdPercentage: 60, // More tolerant for auth
  resetTimeout: 30000 // Faster recovery for auth
});

export const optumEligibilityBreaker = circuitBreakerManager.createBreaker('optum-eligibility', {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000
});

export const redisBreaker = circuitBreakerManager.createBreaker('redis', {
  timeout: 5000, // Fast timeout for Redis
  errorThresholdPercentage: 70, // More tolerant for cache
  resetTimeout: 15000 // Quick recovery for cache
});

export { circuitBreakerManager };
export default CircuitBreakerManager;