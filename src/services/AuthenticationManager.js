import axios from 'axios';
import { createClient } from 'redis';
import { authRetryHandler } from '../utils/retryHandler.js';
import { optumAuthBreaker } from '../utils/circuitBreaker.js';

/**
 * AuthenticationManager handles OAuth2 client credentials flow with Optum API
 * Manages token lifecycle with Redis storage and automatic refresh
 */
class AuthenticationManager {
  constructor(config) {
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      baseUrl: config.baseUrl,
      redisUrl: config.redisUrl,
      tokenRefreshBuffer: config.tokenRefreshBuffer || 5 * 60 * 1000 // 5 minutes in ms
    };
    
    this.redisClient = null;
    this.tokenKey = 'optum:access_token';
    this.isInitialized = false;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.redisClient = createClient({
        url: this.config.redisUrl
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('🔗 Connected to Redis');
      });

      await this.redisClient.connect();
      this.isInitialized = true;
      console.log('✅ AuthenticationManager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AuthenticationManager:', error.message);
      throw error;
    }
  }

  /**
   * Get access token (from cache or by authenticating)
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Try to get token from Redis cache
      const cachedToken = await this.getCachedToken();
      
      if (cachedToken && !this.isTokenExpiring(cachedToken)) {
        console.log('🎯 Using cached access token');
        return cachedToken.token;
      }

      // Token expired or doesn't exist, get new one
      console.log('🔄 Refreshing access token');
      return await this.refreshToken();
    } catch (error) {
      console.error('❌ Failed to get access token:', error.message);
      throw error;
    }
  }

  /**
   * Get cached token from Redis
   * @returns {Promise<Object|null>} Cached token object or null
   */
  async getCachedToken() {
    try {
      const tokenData = await this.redisClient.get(this.tokenKey);
      return tokenData ? JSON.parse(tokenData) : null;
    } catch (error) {
      console.error('❌ Failed to get cached token:', error.message);
      return null;
    }
  }

  /**
   * Check if token is expiring soon
   * @param {Object} tokenData - Token data object
   * @returns {boolean} True if token is expiring within buffer time
   */
  isTokenExpiring(tokenData) {
    if (!tokenData || !tokenData.expiresAt) return true;
    
    const expiresAt = new Date(tokenData.expiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    return timeUntilExpiry <= this.config.tokenRefreshBuffer;
  }

  /**
   * Authenticate with Optum and get new access token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    try {
      const authUrl = `${this.config.baseUrl}/apip/auth/v2/token`;
      
      const requestData = {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'client_credentials'
      };

      console.log('🔐 Authenticating with Optum API...');
      
      // Use circuit breaker with retry handler for authentication requests
      const response = await optumAuthBreaker.fire(
        () => axios.post(authUrl, requestData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }),
        'Optum authentication',
        'auth-request',
        authRetryHandler
      );

      if (response.status !== 200) {
        throw new Error(`Authentication failed with status: ${response.status}`);
      }

      const { access_token, token_type, expires_in } = response.data;
      
      if (!access_token) {
        throw new Error('No access token received from Optum API');
      }

      // Calculate expiration time (expires_in is in seconds)
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600)); // Default 1 hour

      const tokenData = {
        token: access_token,
        tokenType: token_type || 'Bearer',
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      };

      // Store in Redis with TTL
      await this.cacheToken(tokenData, expires_in || 3600);

      console.log(`✅ New access token obtained, expires at: ${expiresAt.toISOString()}`);
      return access_token;

    } catch (error) {
      if (error.response) {
        console.error('❌ Optum API authentication error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Optum authentication failed: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        console.error('❌ Network error during authentication:', error.message);
        throw new Error('Network error during authentication');
      } else {
        console.error('❌ Authentication error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Cache token in Redis
   * @param {Object} tokenData - Token data to cache
   * @param {number} ttlSeconds - Time to live in seconds
   */
  async cacheToken(tokenData, ttlSeconds) {
    try {
      await this.redisClient.setEx(
        this.tokenKey,
        ttlSeconds,
        JSON.stringify(tokenData)
      );
      console.log(`💾 Token cached in Redis with TTL: ${ttlSeconds}s`);
    } catch (error) {
      console.error('❌ Failed to cache token:', error.message);
      // Don't throw here - authentication can still work without caching
    }
  }

  /**
   * Clear cached token (useful for testing or forced refresh)
   */
  async clearToken() {
    try {
      await this.redisClient.del(this.tokenKey);
      console.log('🗑️ Cached token cleared');
    } catch (error) {
      console.error('❌ Failed to clear token:', error.message);
    }
  }

  /**
   * Get token info (for debugging/monitoring)
   * @returns {Promise<Object|null>} Token information
   */
  async getTokenInfo() {
    const cachedToken = await this.getCachedToken();
    if (!cachedToken) return null;

    return {
      hasToken: !!cachedToken.token,
      tokenType: cachedToken.tokenType,
      expiresAt: cachedToken.expiresAt,
      createdAt: cachedToken.createdAt,
      isExpiring: this.isTokenExpiring(cachedToken),
      timeUntilExpiry: cachedToken.expiresAt ? 
        new Date(cachedToken.expiresAt).getTime() - new Date().getTime() : 0
    };
  }

  /**
   * Health check for authentication service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const redisConnected = this.redisClient?.isOpen || false;
      const tokenInfo = await this.getTokenInfo();
      
      return {
        status: 'healthy',
        redis: redisConnected ? 'connected' : 'disconnected',
        token: tokenInfo ? {
          cached: tokenInfo.hasToken,
          expiring: tokenInfo.isExpiring,
          expiresAt: tokenInfo.expiresAt
        } : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('🔌 Redis connection closed');
    }
  }
}

export default AuthenticationManager;