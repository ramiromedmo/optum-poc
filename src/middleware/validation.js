// Validate request body exists and is not empty
// export function validateRequestBody(req, res, next) {
//     if (!req.body || Object.keys(req.body).length === 0) {
//         return res.status(400).json({
//             success: false,
//             error: 'Request body is required',
//             correlationId: req.correlationId,
//             timestamp: new Date().toISOString()
//         });
//     }
//     next();
// }

// Validate Content-Type header for JSON requests
// export function validateContentType(req, res, next) {
//     if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
//         const contentType = req.get('Content-Type');
//         if (!contentType || !contentType.includes('application/json')) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Content-Type must be application/json',
//                 correlationId: req.correlationId,
//                 timestamp: new Date().toISOString()
//             });
//         }
//     }
//     next();
// }

// Validate correlation ID format (UUID v4)
export function validateCorrelationId(req, res, next) {
    const correlationId = req.headers['x-correlation-id'];
    if (correlationId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(correlationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid correlation ID format. Must be a valid UUID v4.',
                correlationId: req.correlationId,
                timestamp: new Date().toISOString()
            });
        }
    }
    next();
}

// Validate query parameters
// export function validateQueryParams(allowedParams = []) {
//     return (req, res, next) => {
//         const queryKeys = Object.keys(req.query);
//         const invalidParams = queryKeys.filter(key => !allowedParams.includes(key));
        
//         if (invalidParams.length > 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: `Invalid query parameters: ${invalidParams.join(', ')}`,
//                 allowedParameters: allowedParams,
//                 correlationId: req.correlationId,
//                 timestamp: new Date().toISOString()
//             });
//         }
//         next();
//     };
// }

// Validate request size
export function validateRequestSize(maxSizeKB = 1024) {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        const maxSizeBytes = maxSizeKB * 1024;
        
        if (contentLength > maxSizeBytes) {
            return res.status(413).json({
                success: false,
                error: `Request too large. Maximum size is ${maxSizeKB}KB`,
                correlationId: req.correlationId,
                timestamp: new Date().toISOString()
            });
        }
        next();
    };
}