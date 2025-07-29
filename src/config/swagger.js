import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Optum Eligibility API POC',
      version: '1.0.0',
      description: 'Healthcare eligibility verification API for Optum integration',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        EligibilityRequest: {
          type: 'object',
          required: ['controlNumber', 'tradingPartnerServiceId', 'provider', 'subscriber', 'encounter'],
          properties: {
            controlNumber: { 
              type: 'string', 
              pattern: '^\\d{9}$',
              example: '123456789',
              description: 'Exactly 9 digits'
            },
            tradingPartnerServiceId: { 
              type: 'string', 
              example: 'CMSMED',
              description: 'Trading partner service identifier'
            },
            provider: {
              type: 'object',
              required: ['organizationName', 'npi', 'serviceProviderNumber', 'providerCode'],
              properties: {
                organizationName: { type: 'string', example: 'provider_name' },
                npi: { 
                  type: 'string', 
                  pattern: '^\\d{10}$',
                  example: '0123456789',
                  description: 'Exactly 10 digits'
                },
                serviceProviderNumber: { type: 'string', example: '54321' },
                providerCode: { 
                  type: 'string', 
                  example: 'AD',
                  description: 'Provider code from Optum documentation'
                },
                referenceIdentification: { type: 'string', example: '54321g' }
              }
            },
            subscriber: {
              type: 'object',
              required: ['memberId', 'firstName', 'lastName', 'gender', 'dateOfBirth'],
              properties: {
                memberId: { type: 'string', example: '0000000000' },
                firstName: { type: 'string', example: 'johnOne' },
                lastName: { type: 'string', example: 'doeOne' },
                gender: { 
                  type: 'string', 
                  enum: ['M', 'F'],
                  example: 'M',
                  description: 'Must be "M" or "F"'
                },
                dateOfBirth: { 
                  type: 'string', 
                  pattern: '^\\d{8}$',
                  example: '18800102',
                  description: 'YYYYMMDD format'
                },
                ssn: { type: 'string', example: '555443333' },
                idCard: { type: 'string', example: 'card123' }
              }
            },
            encounter: {
              type: 'object',
              required: ['beginningDateOfService', 'endDateOfService', 'serviceTypeCodes'],
              properties: {
                beginningDateOfService: { 
                  type: 'string', 
                  pattern: '^\\d{8}$',
                  example: '20100101',
                  description: 'YYYYMMDD format'
                },
                endDateOfService: { 
                  type: 'string', 
                  pattern: '^\\d{8}$',
                  example: '20100102',
                  description: 'YYYYMMDD format'
                },
                serviceTypeCodes: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['98'],
                  minItems: 1,
                  description: 'Array of service type codes'
                }
              }
            },
            dependents: {
              type: 'array',
              items: {
                type: 'object',
                required: ['firstName', 'lastName', 'gender', 'dateOfBirth'],
                properties: {
                  firstName: { type: 'string', example: 'janeOne' },
                  lastName: { type: 'string', example: 'doeone' },
                  gender: { type: 'string', enum: ['M', 'F'], example: 'F' },
                  dateOfBirth: { type: 'string', pattern: '^\\d{8}$', example: '18160421' },
                  groupNumber: { type: 'string', example: '1111111111' }
                }
              }
            }
          }
        },
        EligibilityResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                eligible: { type: 'boolean', example: true },
                eligibilityStatus: { type: 'string', example: 'active' },
                member: {
                  type: 'object',
                  properties: {
                    memberId: { type: 'string', example: '123456789' },
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    dateOfBirth: { type: 'string', example: '19900115' }
                  }
                },
                benefits: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      serviceTypeCode: { type: 'string', example: '1' },
                      serviceType: { type: 'string', example: 'Medical Care' },
                      covered: { type: 'boolean', example: true },
                      coverageLevel: { type: 'string', example: 'Active Coverage' },
                      copay: { type: 'string', example: '$25' },
                      deductible: { type: 'string', example: '$500' },
                      coinsurance: { type: 'string', example: '20%' }
                    }
                  }
                }
              }
            },
            correlationId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        ServiceType: {
          type: 'object',
          properties: {
            code: { type: 'string', example: '1' },
            description: { type: 'string', example: 'Medical Care' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            correlationId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };