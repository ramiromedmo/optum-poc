/**
 * RetryHandler implements exponential backoff with jitter for API calls
 * Handles transient failures, rate limiting, and provides comprehensive retry logic
 */
class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.jitterFactor = options.jitterFactor || 0.1; // 10% jitter
    this.retryableStatusCodes = options.retryableStatusCodes || [408, 429, 500, 502, 503, 504];
    this.retryableErrors = options.retryableErrors || ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];
  }

  /**
   * Execute a function with retry logic
   * @param {Function} fn - Function to execute (should return a Promise)
   * @param {string} operationName - Name of the operation for logging
   * @param {string} correlationId - Request correlation ID
   * @returns {Promise} Result of the function or throws after all retries exhausted
   */
  async execute(fn, operationName = 'API call', correlationId = 'unknown') {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 [${correlationId}] ${operationName} - Attempt ${attempt + 1}/${this.maxRetries + 1}`);
        
        const result = await fn();
        
        if (attempt > 0) {
          console.log(`✅ [${correlationId}] ${operationName} succeeded after ${attempt + 1} attempts`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Check if this is the last attempt
        if (attempt === this.maxRetries) {
          console.error(`❌ [${correlationId}] ${operationName} failed after ${attempt + 1} attempts:`, error.message);
          break;
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          console.error(`❌ [${correlationId}] ${operationName} failed with non-retryable error:`, error.message);
          throw error;
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, error);
        
        console.warn(`⚠️ [${correlationId}] ${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, error.message);
        
        // Wait before next attempt
        await this.sleep(delay);
      }
    }
    
    // All retries exhausted
    throw new Error(`${operationName} failed after ${this.maxRetries + 1} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  isRetryableError(error) {
    // Check HTTP status codes
    if (error.response && error.response.status) {
      const status = error.response.status;
      
      // Always retry rate limiting (429)
      if (status === 429) {
        return true;
      }
      
      // Check other retryable status codes
      return this.retryableStatusCodes.includes(status);
    }
    
    // Check network/connection errors
    if (error.code) {
      return this.retryableErrors.includes(error.code);
    }
    
    // Check for timeout errors
    if (error.message && (
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNRESET')
    )) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate delay for next retry attempt
   * @param {number} attempt - Current attempt number (0-based)
   * @param {Error} error - Error that occurred
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt, error) {
    // Handle rate limiting with Retry-After header
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        const retryAfterMs = parseInt(retryAfter) * 1000; // Convert seconds to ms
        console.log(`⏱️ Rate limited, using Retry-After header: ${retryAfter}s`);
        return Math.min(retryAfterMs, this.maxDelay);
      }
    }
    
    // Exponential backoff: baseDelay * (2 ^ attempt)
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    
    // Add jitter to avoid thundering herd
    const jitter = exponentialDelay * this.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;
    
    // Cap at maximum delay
    return Math.min(delayWithJitter, this.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry wrapper for axios instances
   * @param {Object} axiosInstance - Axios instance to wrap
   * @param {string} operationName - Name for logging
   * @returns {Function} Wrapped function
   */
  wrapAxiosCall(axiosInstance, operationName) {
    return async (config, correlationId = 'unknown') => {
      return this.execute(
        () => axiosInstance(config),
        operationName,
        correlationId
      );
    };
  }

  /**
   * Get retry statistics for monitoring
   * @returns {Object} Retry configuration and statistics
   */
  getStats() {
    return {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      jitterFactor: this.jitterFactor,
      retryableStatusCodes: this.retryableStatusCodes,
      retryableErrors: this.retryableErrors
    };
  }
}

/**
 * Default retry handler instance with sensible defaults
 */
export const defaultRetryHandler = new RetryHandler({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.1
});

/**
 * Retry handler optimized for authentication calls
 */
export const authRetryHandler = new RetryHandler({
  maxRetries: 2, // Fewer retries for auth
  baseDelay: 500,
  maxDelay: 5000,
  jitterFactor: 0.05
});

/**
 * Retry handler for rate-limited APIs
 */
export const rateLimitRetryHandler = new RetryHandler({
  maxRetries: 5, // More retries for rate limiting
  baseDelay: 2000,
  maxDelay: 60000, // Up to 1 minute for rate limits
  jitterFactor: 0.2
});

export default RetryHandler;