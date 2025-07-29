import express from 'express';
import EligibilityController from '../controllers/EligibilityController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const eligibilityController = new EligibilityController();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API service
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: optum-eligibility-poc
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 */
router.get('/health', eligibilityController.healthCheck.bind(eligibilityController));

/**
 * @swagger
 * /service-types:
 *   get:
 *     summary: Get all available service types
 *     description: Returns all EDI 270/271 service type codes and their descriptions
 *     tags: [Service Types]
 *     security: []
 *     responses:
 *       200:
 *         description: List of all service types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     "1": "Medical Care"
 *                     "98": "Professional (Physician) Visit - Office"
 *                 count:
 *                   type: number
 *                   example: 80
 *                 correlationId:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/service-types', eligibilityController.getServiceTypes.bind(eligibilityController));






/**
 * @swagger
 * /eligibility:
 *   post:
 *     summary: Check healthcare eligibility
 *     description: Submit an eligibility check request to verify patient coverage and benefits
 *     tags: [Eligibility]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EligibilityRequest'
 *     responses:
 *       200:
 *         description: Eligibility check successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EligibilityResponse'
 *       400:
 *         description: Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/eligibility', authenticateToken, eligibilityController.checkEligibility.bind(eligibilityController));

export default router;