import AuthenticationManager from './AuthenticationManager.js';
import ServiceTypeManager from './ServiceTypeManager.js';
import SimpleResponseParser from './SimpleResponseParser.js';
import ApiClient from './ApiClient.js';
import config from '../utils/config.js';

/**
 * EligibilityService handles healthcare eligibility checks with Optum API
 * Integrates authentication, request validation, API calls, and response processing
 */
class EligibilityService {
    constructor() {
        this.authManager = new AuthenticationManager({
            clientId: config.optum.clientId,
            clientSecret: config.optum.clientSecret,
            baseUrl: config.optum.baseUrl,
            redisUrl: config.redis.url
        });
        
        this.serviceTypeManager = new ServiceTypeManager();
        this.responseParser = new SimpleResponseParser();
        
        this.apiClient = ApiClient.createOptumClient({
            baseUrl: config.optum.baseUrl,
            timeout: config.optum.timeout
        });
        
        this.isInitialized = false;
    }

    /**
     * Initialize the eligibility service
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.authManager.initialize();
            this.isInitialized = true;
            console.log('✅ EligibilityService initialized');
        } catch (error) {
            console.error('❌ Failed to initialize EligibilityService:', error.message);
            throw error;
        }
    }

    /**
     * Check eligibility with Optum API
     * @param {Object} request - Eligibility request object
     * @param {string} correlationId - Request correlation ID
     * @returns {Promise<Object>} Eligibility response
     */
    async checkEligibility(request, correlationId = 'unknown') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            console.log(`🏥 [${correlationId}] Starting eligibility check`);

            // Validate the request
            const validationResult = this.validateRequest(request);
            if (!validationResult.isValid) {
                throw new Error(`Request validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Validate service type codes
            const serviceTypeValidation = this.serviceTypeManager.validateCodes(
                request.encounter?.serviceTypeCodes || []
            );
            if (!serviceTypeValidation.isValid) {
                throw new Error(`Invalid service type codes: ${serviceTypeValidation.invalidCodes.join(', ')}`);
            }

            // Get access token
            const accessToken = await this.authManager.getAccessToken();
            this.apiClient.setAuthToken(accessToken);

            // Prepare the request for Optum API
            const optumRequest = this.prepareOptumRequest(request);
            
            console.log(`📤 [${correlationId}] Sending eligibility request to Optum API`);

            // Make the API call
            const response = await this.apiClient.post(
                '/medicalnetwork/eligibility/v3/',
                optumRequest,
                {
                    correlationId,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`📥 [${correlationId}] Received eligibility response from Optum API`);

            // Process and return the response using SimpleResponseParser
            const parsedResponse = this.responseParser.parseEligibilityResponse(response.data, request, correlationId);
            
            return parsedResponse;

        } catch (error) {
            console.error(`❌ [${correlationId}] Eligibility check failed:`, error.message);
            
            // Handle specific error types
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                
                if (status === 401) {
                    throw new Error('Authentication failed with Optum API');
                } else if (status === 400) {
                    throw new Error(`Bad request to Optum API: ${data?.message || 'Invalid request format'}`);
                } else if (status === 429) {
                    throw new Error('Rate limited by Optum API - please try again later');
                } else if (status >= 500) {
                    throw new Error('Optum API server error - please try again later');
                }
            }
            
            throw error;
        }
    }

    /**
     * Validate eligibility request
     * @param {Object} request - Request to validate
     * @returns {Object} Validation result
     */
    validateRequest(request) {
        const errors = [];

        if (!request) {
            errors.push('Request is required');
            return { isValid: false, errors };
        }

        // Required top-level fields
        const requiredFields = [
            'controlNumber',
            'tradingPartnerServiceId',
            'provider',
            'subscriber',
            'encounter'
        ];

        for (const field of requiredFields) {
            if (!request[field]) {
                errors.push(`${field} is required`);
            }
        }

        // Validate controlNumber format (9 digits)
        if (request.controlNumber && !/^\d{9}$/.test(request.controlNumber)) {
            errors.push('controlNumber must be exactly 9 digits');
        }

        // Validate provider
        if (request.provider) {
            const providerRequired = ['organizationName', 'npi', 'serviceProviderNumber', 'providerCode'];
            for (const field of providerRequired) {
                if (!request.provider[field]) {
                    errors.push(`provider.${field} is required`);
                }
            }

            // Validate NPI format (10 digits)
            if (request.provider.npi && !/^\d{10}$/.test(request.provider.npi)) {
                errors.push('provider.npi must be exactly 10 digits');
            }
        }

        // Validate subscriber
        if (request.subscriber) {
            const subscriberRequired = ['memberId', 'firstName', 'lastName', 'gender', 'dateOfBirth'];
            for (const field of subscriberRequired) {
                if (!request.subscriber[field]) {
                    errors.push(`subscriber.${field} is required`);
                }
            }

            // Validate gender
            if (request.subscriber.gender && !['M', 'F'].includes(request.subscriber.gender)) {
                errors.push('subscriber.gender must be "M" or "F"');
            }

            // Validate dateOfBirth format (YYYYMMDD)
            if (request.subscriber.dateOfBirth && !/^\d{8}$/.test(request.subscriber.dateOfBirth)) {
                errors.push('subscriber.dateOfBirth must be in YYYYMMDD format');
            }
        }

        // Validate encounter
        if (request.encounter) {
            const encounterRequired = ['beginningDateOfService', 'endDateOfService', 'serviceTypeCodes'];
            for (const field of encounterRequired) {
                if (!request.encounter[field]) {
                    errors.push(`encounter.${field} is required`);
                }
            }

            // Validate date formats
            if (request.encounter.beginningDateOfService && !/^\d{8}$/.test(request.encounter.beginningDateOfService)) {
                errors.push('encounter.beginningDateOfService must be in YYYYMMDD format');
            }

            if (request.encounter.endDateOfService && !/^\d{8}$/.test(request.encounter.endDateOfService)) {
                errors.push('encounter.endDateOfService must be in YYYYMMDD format');
            }

            // Validate serviceTypeCodes
            if (request.encounter.serviceTypeCodes) {
                if (!Array.isArray(request.encounter.serviceTypeCodes)) {
                    errors.push('encounter.serviceTypeCodes must be an array');
                } else if (request.encounter.serviceTypeCodes.length === 0) {
                    errors.push('encounter.serviceTypeCodes must contain at least one code');
                }
            }
        }

        // Validate dependents if present
        if (request.dependents && Array.isArray(request.dependents)) {
            request.dependents.forEach((dependent, index) => {
                if (!dependent.firstName) {
                    errors.push(`dependents[${index}].firstName is required`);
                }
                if (!dependent.lastName) {
                    errors.push(`dependents[${index}].lastName is required`);
                }
                if (!dependent.gender || !['M', 'F'].includes(dependent.gender)) {
                    errors.push(`dependents[${index}].gender must be "M" or "F"`);
                }
                if (!dependent.dateOfBirth || !/^\d{8}$/.test(dependent.dateOfBirth)) {
                    errors.push(`dependents[${index}].dateOfBirth must be in YYYYMMDD format`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Prepare request for Optum API format
     * @param {Object} request - Original request
     * @returns {Object} Optum-formatted request
     */
    prepareOptumRequest(request) {
        // The request is already in the correct format for Optum API
        // Just ensure all required fields are present and properly formatted
        return {
            controlNumber: request.controlNumber,
            tradingPartnerServiceId: request.tradingPartnerServiceId,
            provider: {
                organizationName: request.provider.organizationName,
                npi: request.provider.npi,
                serviceProviderNumber: request.provider.serviceProviderNumber,
                providerCode: request.provider.providerCode,
                referenceIdentification: request.provider.referenceIdentification
            },
            subscriber: {
                memberId: request.subscriber.memberId,
                firstName: request.subscriber.firstName,
                lastName: request.subscriber.lastName,
                gender: request.subscriber.gender,
                dateOfBirth: request.subscriber.dateOfBirth,
                ...(request.subscriber.ssn && { ssn: request.subscriber.ssn }),
                ...(request.subscriber.idCard && { idCard: request.subscriber.idCard })
            },
            ...(request.dependents && { dependents: request.dependents }),
            encounter: {
                beginningDateOfService: request.encounter.beginningDateOfService,
                endDateOfService: request.encounter.endDateOfService,
                serviceTypeCodes: request.encounter.serviceTypeCodes
            }
        };
    }



    /**
     * Get service health status
     * @returns {Object} Health status
     */
    async getHealthStatus() {
        try {
            const authHealth = await this.authManager.healthCheck();
            
            return {
                status: 'healthy',
                initialized: this.isInitialized,
                authentication: authHealth,
                serviceTypes: {
                    loaded: Object.keys(this.serviceTypeManager.getAllServiceTypes()).length
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                initialized: this.isInitialized,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Close connections and cleanup
     */
    async close() {
        if (this.authManager) {
            await this.authManager.close();
        }
        console.log('🔌 EligibilityService closed');
    }
}

export default EligibilityService;