import ServiceTypeManager from './ServiceTypeManager.js';

// Simplified Response Parser for POC
class SimpleResponseParser {
    constructor() {
        this.serviceTypeManager = new ServiceTypeManager();
    }

    // Main parsing method - returns simple, clean response
    parseEligibilityResponse(response, originalRequest, correlationId) {
        console.log(`📋 [${correlationId}] Parsing eligibility response (simplified)`);

        try {
            // Handle errors first
            if (response.errors && response.errors.length > 0) {
                return {
                    eligible: false,
                    eligibilityStatus: 'error',
                    error: {
                        message: response.errors[0].description || 'Eligibility check failed',
                        code: response.errors[0].code || 'UNKNOWN'
                    },
                    member: {
                        memberId: originalRequest.subscriber?.memberId,
                        firstName: originalRequest.subscriber?.firstName,
                        lastName: originalRequest.subscriber?.lastName
                    },
                    correlationId,
                    timestamp: new Date().toISOString()
                };
            }

            // Parse successful response
            const coverage = this.parseSimpleCoverage(response, originalRequest);
            const isEligible = coverage.some(c => c.covered);

            return {
                eligible: isEligible,
                eligibilityStatus: isEligible ? 'active' : 'inactive',
                member: {
                    memberId: response.subscriber?.memberId || originalRequest.subscriber?.memberId,
                    firstName: response.subscriber?.firstName || originalRequest.subscriber?.firstName,
                    lastName: response.subscriber?.lastName || originalRequest.subscriber?.lastName,
                    dateOfBirth: response.subscriber?.dateOfBirth || originalRequest.subscriber?.dateOfBirth
                },
                payer: response.payer ? {
                    name: response.payer.name,
                    payorIdentification: response.payer.payorIdentification
                } : null,
                benefits: coverage,
                correlationId,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ [${correlationId}] Error parsing response:`, error.message);
            return {
                eligible: false,
                status: 'error',
                message: 'Failed to process eligibility response',
                correlationId,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Parse coverage for requested services
    parseSimpleCoverage(response, originalRequest) {
        const requestedServices = originalRequest.encounter?.serviceTypeCodes || [];
        const coverage = [];

        // Look through benefits information
        if (response.benefitsInformation) {
            for (const benefit of response.benefitsInformation) {
                const coveredServices = benefit.serviceTypeCodes || [];

                // Check if any requested service matches
                for (const serviceCode of requestedServices) {
                    if (coveredServices.includes(serviceCode)) {
                        coverage.push({
                            serviceTypeCode: serviceCode,
                            serviceType: this.serviceTypeManager.getDescription(serviceCode) || 'Unknown Service',
                            covered: benefit.code === '1' || benefit.name === 'Active Coverage',
                            coverageLevel: benefit.name || 'Unknown',
                            copay: benefit.copayAmount ? `$${benefit.copayAmount}` : null,
                            deductible: benefit.benefitAmount ? `$${benefit.benefitAmount}` : null,
                            coinsurance: benefit.benefitPercent ? `${Math.round(benefit.benefitPercent * 100)}%` : null
                        });
                        break; // Found coverage for this service, move to next
                    }
                }
            }
        }

        // If no coverage found, mark requested services as not covered
        for (const serviceCode of requestedServices) {
            if (!coverage.find(c => c.serviceTypeCode === serviceCode)) {
                coverage.push({
                    serviceTypeCode: serviceCode,
                    serviceType: this.serviceTypeManager.getDescription(serviceCode) || 'Unknown Service',
                    covered: false,
                    coverageLevel: 'Not Covered'
                });
            }
        }

        return coverage;
    }
}

export default SimpleResponseParser;