import config from '../utils/config.js';

// Async error wrapper
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Not found handler
export function notFoundHandler(req, res, next) {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.status = 404;
    error.correlationId = req.correlationId;
    next(error);
}

// Global error handler
export function globalErrorHandler(error, req, res, next) {
    const correlationId = req.correlationId || 'unknown';
    
    // Log error details
    console.error(`❌ [${correlationId}] Error:`, {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Determine error type and status code
    const errorResponse = categorizeError(error, correlationId);
    
    // Add development-specific details
    if (config.server.nodeEnv === 'development') {
        errorResponse.stack = error.stack;
        errorResponse.details = {
            url: req.originalUrl,
            method: req.method,
            headers: req.headers,
            body: req.body
        };
    }

    res.status(errorResponse.statusCode).json(errorResponse);
}

// Categorize error and create appropriate response
function categorizeError(error, correlationId) {
    const baseResponse = {
        success: false,
        correlationId,
        timestamp: new Date().toISOString()
    };

    // Handle known error types
    if (error.name === 'ValidationError') {
        return {
            ...baseResponse,
            statusCode: 400,
            error: 'Validation Error',
            message: error.message,
            type: 'validation_error'
        };
    }

    if (error.name === 'UnauthorizedError' || error.status === 401) {
        return {
            ...baseResponse,
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Authentication required',
            type: 'auth_error'
        };
    }

    if (error.name === 'ForbiddenError' || error.status === 403) {
        return {
            ...baseResponse,
            statusCode: 403,
            error: 'Forbidden',
            message: 'Insufficient permissions',
            type: 'auth_error'
        };
    }

    if (error.status === 404) {
        return {
            ...baseResponse,
            statusCode: 404,
            error: 'Not Found',
            message: error.message || 'Resource not found',
            type: 'not_found_error'
        };
    }

    if (error.name === 'PayloadTooLargeError' || error.status === 413) {
        return {
            ...baseResponse,
            statusCode: 413,
            error: 'Payload Too Large',
            message: 'Request payload exceeds size limit',
            type: 'size_error'
        };
    }

    if (error.name === 'TooManyRequestsError' || error.status === 429) {
        return {
            ...baseResponse,
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
            retryAfter: error.retryAfter || 60
        };
    }

    // Handle circuit breaker errors
    if (error.message && error.message.includes('unavailable')) {
        return {
            ...baseResponse,
            statusCode: 503,
            error: 'Service Unavailable',
            message: 'External service temporarily unavailable',
            type: 'service_unavailable_error'
        };
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        return {
            ...baseResponse,
            statusCode: 504,
            error: 'Gateway Timeout',
            message: 'Request timeout',
            type: 'timeout_error'
        };
    }

    // Handle JSON parsing errors
    if (error.type === 'entity.parse.failed') {
        return {
            ...baseResponse,
            statusCode: 400,
            error: 'Invalid JSON',
            message: 'Request body contains invalid JSON',
            type: 'parse_error'
        };
    }

    // Default server error
    return {
        ...baseResponse,
        statusCode: error.status || 500,
        error: 'Internal Server Error',
        message: config.server.nodeEnv === 'development' ? error.message : 'An unexpected error occurred',
        type: 'server_error'
    };
}

// Custom error classes
export class ValidationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

export class UnauthorizedError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'UnauthorizedError';
        this.status = 401;
    }
}

export class ForbiddenError extends Error {
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.name = 'ForbiddenError';
        this.status = 403;
    }
}

export class TooManyRequestsError extends Error {
    constructor(message = 'Rate limit exceeded', retryAfter = 60) {
        super(message);
        this.name = 'TooManyRequestsError';
        this.status = 429;
        this.retryAfter = retryAfter;
    }
}