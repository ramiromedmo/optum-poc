import axios from 'axios';
import { defaultRetryHandler, rateLimitRetryHandler } from '../utils/retryHandler.js';
import { circuitBreakerManager } from '../utils/circuitBreaker.js';

/**
 * ApiClient provides a resilient HTTP client with retry logic
 * Wraps axios with retry handlers and provides common functionality
 */
class ApiClient {
    constructor(options = {}) {
        this.baseURL = options.baseURL;
        this.timeout = options.timeout || 30000;
        this.retryHandler = options.retryHandler || defaultRetryHandler;
        this.circuitBreakerName = options.circuitBreakerName;

        // Create circuit breaker if name provided
        if (this.circuitBreakerName) {
            circuitBreakerManager.createBreaker(this.circuitBreakerName, {
                timeout: this.timeout,
                errorThresholdPercentage: options.errorThresholdPercentage || 50,
                resetTimeout: options.resetTimeout || 60000
            });
        }

        // Create axios instance
        this.axios = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Optum-Eligibility-POC/1.0.0'
            }
        });

        // Add request interceptor for logging
        this.axios.interceptors.request.use(
            (config) => {
                const correlationId = config.correlationId || 'unknown';
                console.log(`📤 [${correlationId}] ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('❌ Request interceptor error:', error.message);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging
        this.axios.interceptors.response.use(
            (response) => {
                const correlationId = response.config.correlationId || 'unknown';
                console.log(`📥 [${correlationId}] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${response.headers['content-length'] || 'unknown'} bytes)`);
                return response;
            },
            (error) => {
                const correlationId = error.config?.correlationId || 'unknown';
                const status = error.response?.status || 'network error';
                console.error(`📥 [${correlationId}] ${status} ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.message}`);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Make a GET request with retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async get(url, options = {}) {
        const config = {
            method: 'GET',
            url,
            ...options,
            correlationId: options.correlationId || 'unknown'
        };

        if (this.circuitBreakerName) {
            return circuitBreakerManager.execute(
                this.circuitBreakerName,
                () => this.axios(config),
                `GET ${url}`,
                config.correlationId,
                this.retryHandler
            );
        }

        return this.retryHandler.execute(
            () => this.axios(config),
            `GET ${url}`,
            config.correlationId
        );
    }

    /**
     * Make a POST request with retry logic
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async post(url, data = {}, options = {}) {
        const config = {
            method: 'POST',
            url,
            data,
            ...options,
            correlationId: options.correlationId || 'unknown'
        };

        if (this.circuitBreakerName) {
            return circuitBreakerManager.execute(
                this.circuitBreakerName,
                () => this.axios(config),
                `POST ${url}`,
                config.correlationId,
                this.retryHandler
            );
        }

        return this.retryHandler.execute(
            () => this.axios(config),
            `POST ${url}`,
            config.correlationId
        );
    }

    /**
     * Set authorization header for subsequent requests
     * @param {string} token - Bearer token
     */
    setAuthToken(token) {
        this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    /**
     * Remove authorization header
     */
    clearAuthToken() {
        delete this.axios.defaults.headers.common['Authorization'];
    }

    /**
     * Set custom headers for subsequent requests
     * @param {Object} headers - Headers to set
     */
    setHeaders(headers) {
        Object.assign(this.axios.defaults.headers.common, headers);
    }

    /**
     * Get current retry handler statistics
     * @returns {Object} Retry statistics
     */
    getRetryStats() {
        return this.retryHandler.getStats();
    }

    /**
     * Create a new ApiClient instance with rate limiting retry handler
     * @param {Object} options - Client options
     * @returns {ApiClient} New client instance
     */
    static createRateLimitedClient(options = {}) {
        return new ApiClient({
            ...options,
            retryHandler: rateLimitRetryHandler
        });
    }

    /**
     * Create a new ApiClient instance for Optum API
     * @param {Object} config - Configuration object
     * @returns {ApiClient} Configured Optum API client
     */
    static createOptumClient(config) {
        return new ApiClient({
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000,
            retryHandler: rateLimitRetryHandler, // Optum API may have rate limits
            circuitBreakerName: 'optum-eligibility', // Use predefined circuit breaker
            errorThresholdPercentage: 50,
            resetTimeout: 60000
        });
    }

    /**
     * Create a new ApiClient instance for Optum Auth API
     * @param {Object} config - Configuration object
     * @returns {ApiClient} Configured Optum Auth API client
     */
    static createOptumAuthClient(config) {
        return new ApiClient({
            baseURL: config.baseUrl,
            timeout: config.timeout || 15000,
            retryHandler: rateLimitRetryHandler,
            circuitBreakerName: 'optum-auth', // Use predefined auth circuit breaker
            errorThresholdPercentage: 60,
            resetTimeout: 30000
        });
    }

    /**
     * Health check for the API client
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            baseURL: this.baseURL,
            timeout: this.timeout,
            retryConfig: this.retryHandler.getStats(),
            timestamp: new Date().toISOString()
        };
    }
}

export default ApiClient;