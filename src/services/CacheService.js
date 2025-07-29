import { createClient } from 'redis';
import config from '../utils/config.js';

class CacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            totalRequests: 0
        };
        this.keyPrefix = config.cache.keyPrefix || 'optum:eligibility:';
        this.defaultTTL = config.cache.ttlSeconds || 300; // 5 minutes
    }

    // Initialize Redis connection
    async initialize() {
        if (this.isConnected) return;

        try {
            this.client = createClient({
                url: config.redis.url,
                socket: {
                    connectTimeout: 5000,
                    lazyConnect: true
                }
            });

            // Set up event listeners
            this.client.on('error', (err) => {
                console.error('❌ Redis Client Error:', err.message);
                this.stats.errors++;
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('🔗 Redis connecting...');
            });

            this.client.on('ready', () => {
                console.log('✅ Redis connected and ready');
                this.isConnected = true;
            });

            this.client.on('end', () => {
                console.log('🔌 Redis connection ended');
                this.isConnected = false;
            });

            this.client.on('reconnecting', () => {
                console.log('🔄 Redis reconnecting...');
            });

            await this.client.connect();
            console.log('✅ CacheService initialized');
        } catch (error) {
            console.error('❌ Failed to initialize CacheService:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    // Generate cache key for eligibility requests
    generateEligibilityKey(request) {
        // Create a deterministic key based on request parameters
        const keyData = {
            memberId: request.subscriber?.memberId,
            npi: request.provider?.npi,
            serviceTypes: request.encounter?.serviceTypeCodes?.sort(),
            dateOfService: request.encounter?.beginningDateOfService
        };
        
        const keyString = JSON.stringify(keyData);
        const hash = this.simpleHash(keyString);
        return `${this.keyPrefix}eligibility:${hash}`;
    }

    // Generate cache key for tokens
    generateTokenKey(identifier) {
        return `${this.keyPrefix}token:${identifier}`;
    }

    // Get cached eligibility response
    async getEligibilityResponse(request, correlationId = 'unknown') {
        if (!this.isConnected) {
            console.warn(`⚠️ [${correlationId}] Redis not connected, skipping cache lookup`);
            return null;
        }

        try {
            this.stats.totalRequests++;
            const key = this.generateEligibilityKey(request);
            
            console.log(`🔍 [${correlationId}] Cache lookup: ${key}`);
            const cached = await this.client.get(key);
            
            if (cached) {
                this.stats.hits++;
                const data = JSON.parse(cached);
                console.log(`✅ [${correlationId}] Cache HIT - Age: ${this.getCacheAge(data.cachedAt)}`);
                
                // Add cache metadata
                data.cacheMetadata = {
                    hit: true,
                    key: key,
                    cachedAt: data.cachedAt,
                    age: this.getCacheAge(data.cachedAt)
                };
                
                return data;
            } else {
                this.stats.misses++;
                console.log(`❌ [${correlationId}] Cache MISS`);
                return null;
            }
        } catch (error) {
            this.stats.errors++;
            console.error(`❌ [${correlationId}] Cache lookup error:`, error.message);
            return null; // Fail gracefully
        }
    }

    // Cache eligibility response
    async setEligibilityResponse(request, response, correlationId = 'unknown', ttl = null) {
        if (!this.isConnected) {
            console.warn(`⚠️ [${correlationId}] Redis not connected, skipping cache set`);
            return;
        }

        try {
            const key = this.generateEligibilityKey(request);
            const cacheData = {
                ...response,
                cachedAt: new Date().toISOString(),
                originalCorrelationId: correlationId
            };
            
            const ttlSeconds = ttl || this.defaultTTL;
            await this.client.setEx(key, ttlSeconds, JSON.stringify(cacheData));
            
            this.stats.sets++;
            console.log(`💾 [${correlationId}] Cached response: ${key} (TTL: ${ttlSeconds}s)`);
        } catch (error) {
            this.stats.errors++;
            console.error(`❌ [${correlationId}] Cache set error:`, error.message);
            // Don't throw - caching failures shouldn't break the main flow
        }
    }

    // Get cached token
    async getToken(identifier) {
        if (!this.isConnected) return null;

        try {
            const key = this.generateTokenKey(identifier);
            const cached = await this.client.get(key);
            
            if (cached) {
                const data = JSON.parse(cached);
                console.log(`🎯 Token cache HIT: ${identifier}`);
                return data;
            } else {
                console.log(`❌ Token cache MISS: ${identifier}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Token cache lookup error:`, error.message);
            return null;
        }
    }

    // Cache token
    async setToken(identifier, tokenData, ttl) {
        if (!this.isConnected) return;

        try {
            const key = this.generateTokenKey(identifier);
            await this.client.setEx(key, ttl, JSON.stringify(tokenData));
            console.log(`💾 Token cached: ${identifier} (TTL: ${ttl}s)`);
        } catch (error) {
            console.error(`❌ Token cache set error:`, error.message);
        }
    }



    // Get basic cache health status
    async getHealthStatus() {
        try {
            if (!this.isConnected) {
                return {
                    status: 'unhealthy',
                    connected: false,
                    error: 'Redis not connected'
                };
            }

            // Test Redis connection with a ping
            const pingResult = await this.client.ping();
            return {
                status: pingResult === 'PONG' ? 'healthy' : 'unhealthy',
                connected: this.isConnected
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message
            };
        }
    }

    // Calculate cache age in human-readable format
    getCacheAge(cachedAt) {
        const now = new Date();
        const cached = new Date(cachedAt);
        const ageMs = now - cached;
        const ageSeconds = Math.floor(ageMs / 1000);
        
        if (ageSeconds < 60) return `${ageSeconds}s`;
        if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m`;
        return `${Math.floor(ageSeconds / 3600)}h`;
    }

    // Simple hash function for cache keys
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }



    // Close Redis connection
    async close() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            console.log('🔌 CacheService connection closed');
        }
    }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;