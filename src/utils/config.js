import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class Config {
  constructor() {
    this.validateRequiredEnvVars();
  }

  // Validate required environment variables
  validateRequiredEnvVars() {
    const required = [
      'OPTUM_CLIENT_ID',
      'OPTUM_CLIENT_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing.join(', '));
      console.error('💡 Please check your .env file or environment configuration');
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  get optum() {
    return {
      clientId: process.env.OPTUM_CLIENT_ID,
      clientSecret: process.env.OPTUM_CLIENT_SECRET,
      baseUrl: process.env.OPTUM_BASE_URL || 'https://sandbox-apigw.optum.com',
      timeout: parseInt(process.env.OPTUM_TIMEOUT) || 30000
    };
  }

  get redis() {
    return {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    };
  }

  get server() {
    return {
      port: parseInt(process.env.PORT) || 3000,
      apiToken: process.env.API_TOKEN || 'hardcoded-token',
      nodeEnv: process.env.NODE_ENV || 'development'
    };
  }

  get circuitBreaker() {
    return {
      timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 30000,
      errorThreshold: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD) || 5,
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 60000
    };
  }

  get cache() {
    return {
      ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 300, // 5 minutes
      keyPrefix: process.env.CACHE_KEY_PREFIX || 'optum:eligibility:'
    };
  }

  get logging() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false'
    };
  }

  get auth() {
    return {
      tokenRefreshBuffer: 5 * 60 * 1000, // 5 minutes - hardcoded for POC
      maxRetries: 3 // hardcoded for POC
    };
  }

  getAll() {
    return {
      optum: this.optum,
      redis: this.redis,
      server: this.server,
      circuitBreaker: this.circuitBreaker,
      cache: this.cache,
      logging: this.logging
    };
  }

  // Print configuration summary (without sensitive data)
  printSummary() {
    console.log('⚙️  Configuration Summary:');
    console.log(`   • Environment: ${this.server.nodeEnv}`);
    console.log(`   • Server Port: ${this.server.port}`);
    console.log(`   • Optum Base URL: ${this.optum.baseUrl}`);
    console.log(`   • Redis URL: ${this.redis.url}`);
    console.log(`   • Cache TTL: ${this.cache.ttlSeconds}s`);
    console.log(`   • Log Level: ${this.logging.level}`);
    console.log(`   • Circuit Breaker Timeout: ${this.circuitBreaker.timeout}ms`);
  }
}

// Export singleton instance
const config = new Config();
export default config;