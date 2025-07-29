class HealthCheckService {
    // Get basic health status
    getHealth() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'optum-eligibility-poc',
            version: '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        };
    }
}

// Export singleton instance
const healthCheckService = new HealthCheckService();
export default healthCheckService;