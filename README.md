# Optum Eligibility API POC

A proof of concept for integrating with Optum's healthcare eligibility APIs. This POC includes good practices for API integration including authentication, caching, retry logic, circuit breakers, and comprehensive observability.

## 🏗️ Architecture Overview

```
Client → Your API (POST /eligibility) → Optum APIs (auth + eligibility)
                    ↓
                Redis Cache
```

This POC creates a **REST API service** that acts as a proxy to Optum's eligibility APIs with the following features:

- ✅ **REST API**: Express.js server with comprehensive endpoints
- ✅ **Authentication**: OAuth2 client credentials flow with token caching
- ✅ **Caching**: Redis-based response caching with configurable TTL
- ✅ **Resilience**: Retry logic with exponential backoff and circuit breakers
- ✅ **Observability**: Request tracing, metrics, and health checks
- ✅ **Security**: Rate limiting, input validation, and secure headers
- ✅ **Documentation**: Interactive Swagger/OpenAPI documentation
- ✅ **Containerized**: Docker Compose setup for easy deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ 
- Docker and Docker Compose
- Redis (or use Docker Compose)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd optum-poc
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your Optum API credentials
```

Required environment variables:
```env
OPTUM_CLIENT_ID=your_client_id
OPTUM_CLIENT_SECRET=your_client_secret
OPTUM_BASE_URL=https://sandbox-apigw.optum.com
REDIS_URL=redis://localhost:6379
API_TOKEN=hardcoded-token
```

### 3. Start with Docker Compose (Recommended)

```bash
# Build and start all services
npm run docker:up

# Or manually:
docker-compose up --build
```

This starts:
- **Application**: http://localhost:3000
- **Redis**: localhost:6379

## 📚 Documentation

### API Documentation
Once running, visit:
- **Interactive API Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

### Project Documentation
- **[Optum API Guide](docs/optum-api-guide.md)** - Complete guide to Optum's eligibility API including request/response formats, field explanations, and implementation details. 
Source: https://developer.optum.com/eligibilityandclaims/reference/medicaleligibility
- **[Service Type Codes](docs/serviceTypes.json)** - Complete mapping of EDI service type codes (1, 98, 88, etc.) to human-readable descriptions. 
Source: https://www.uhcprovider.com/content/dam/provider/docs/public/resources/edi/EDI-270-271-Companion-Guide-005010X279A1.pdf

## 🔍 API Endpoints

### Core Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/eligibility` | Check healthcare eligibility | ✅ Bearer Token |
| GET | `/service-types` | Get all service type codes | ❌ |
| GET | `/service-types/search?q=term` | Search service types | ❌ |

## 🧪 Testing

### Pending

## 📋 Sample Request

### Eligibility Check

```bash
curl -X POST http://localhost:3000/eligibility \
  -H "Authorization: Bearer hardcoded-token" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: test-123" \
  -d '{
    "subscriber": {
      "memberId": "12345678901",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1985-06-15"
    },
    "provider": {
      "npi": "1234567890",
      "name": "Test Provider",
      "taxId": "123456789"
    },
    "encounter": {
      "serviceTypeCodes": ["1", "98"],
      "beginningDateOfService": "2024-01-15"
    }
  }'
```

### Response Format

```json
{
  "success": true,
  "data": {
    "eligibilityStatus": "eligible",
    "subscriber": {
      "memberId": "12345678901",
      "firstName": "John",
      "lastName": "Doe"
    },
    "benefits": [
      {
        "serviceTypeCode": "1",
        "serviceTypeDescription": "Medical Care",
        "coverageLevel": "individual",
        "benefitStatus": "active"
      }
    ],
    "summary": {
      "totalBenefits": 1,
      "activeBenefits": 1,
      "eligibleServices": ["1", "98"]
    },
    "cacheMetadata": {
      "cached": false,
      "source": "optum-api"
    }
  },
  "correlationId": "test-123",
  "duration": "1250ms",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPTUM_CLIENT_ID` | - | Optum API client ID (required) |
| `OPTUM_CLIENT_SECRET` | - | Optum API client secret (required) |
| `OPTUM_BASE_URL` | `https://sandbox-apigw.optum.com` | Optum API base URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `API_TOKEN` | `hardcoded-token` | Bearer token for API access |
| `PORT` | `3000` | Server port |
| `CACHE_TTL_SECONDS` | `300` | Cache TTL (5 minutes) |
| `CIRCUIT_BREAKER_TIMEOUT` | `30000` | Circuit breaker timeout (30s) |
| `CIRCUIT_BREAKER_ERROR_THRESHOLD` | `5` | Error threshold for circuit breaker |
| `LOG_LEVEL` | `info` | Logging level |

### Service Type Codes

The application includes some EDI 270/271 service type codes. See **[docs/serviceTypes.json](docs/serviceTypes.json)** for the complete mapping. Common codes:

- `1`: Medical Care
- `98`: Professional (Physician) Visit - Office
- `88`: Pharmacy
- `35`: Dental Care
- `AL`: Vision (Optometry)


