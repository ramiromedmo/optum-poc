import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ServiceTypeManager handles EDI 270/271 service type codes
 * Provides validation and description mapping for service types
 */
class ServiceTypeManager {
  constructor() {
    this.serviceTypes = null;
    this.loadServiceTypes();
  }

  /**
   * Load service type codes from JSON configuration file
   */
  loadServiceTypes() {
    try {
      const configPath = path.join(__dirname, '../../docs/serviceTypes.json');
      const data = fs.readFileSync(configPath, 'utf8');
      this.serviceTypes = JSON.parse(data);
      console.log(`✅ Loaded ${Object.keys(this.serviceTypes).length} service type codes`);
    } catch (error) {
      console.error('❌ Failed to load service types configuration:', error.message);
      throw new Error('Service types configuration could not be loaded');
    }
  }

  /**
   * Get description for a service type code
   * @param {string} code - Service type code
   * @returns {string|null} Description or null if not found
   */
  getDescription(code) {
    if (!this.serviceTypes) {
      throw new Error('Service types not loaded');
    }
    return this.serviceTypes[code] || null;
  }

  /**
   * Validate if a service type code is supported
   * @param {string} code - Service type code to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isValidCode(code) {
    if (!this.serviceTypes) {
      throw new Error('Service types not loaded');
    }
    return code in this.serviceTypes;
  }

  /**
   * Validate an array of service type codes
   * @param {string[]} codes - Array of service type codes
   * @returns {Object} Validation result with valid/invalid codes
   */
  validateCodes(codes) {
    if (!Array.isArray(codes)) {
      return {
        isValid: false,
        validCodes: [],
        invalidCodes: [],
        error: 'Service type codes must be an array'
      };
    }

    const validCodes = [];
    const invalidCodes = [];

    for (const code of codes) {
      if (this.isValidCode(code)) {
        validCodes.push(code);
      } else {
        invalidCodes.push(code);
      }
    }

    return {
      isValid: invalidCodes.length === 0,
      validCodes,
      invalidCodes,
      error: invalidCodes.length > 0 ? `Invalid service type codes: ${invalidCodes.join(', ')}` : null
    };
  }

  /**
   * Map service type codes to their descriptions
   * @param {string[]} codes - Array of service type codes
   * @returns {Object[]} Array of objects with code and description
   */
  mapCodesToDescriptions(codes) {
    if (!Array.isArray(codes)) {
      return [];
    }

    return codes.map(code => ({
      code,
      description: this.getDescription(code) || 'Unknown service type'
    }));
  }

  /**
   * Get all available service type codes
   * @returns {Object} All service type codes and descriptions
   */
  getAllServiceTypes() {
    if (!this.serviceTypes) {
      throw new Error('Service types not loaded');
    }
    return { ...this.serviceTypes };
  }

  /**
   * Search service types by description (case-insensitive)
   * @param {string} searchTerm - Term to search for in descriptions
   * @returns {Object[]} Array of matching service types
   */
  searchByDescription(searchTerm) {
    if (!this.serviceTypes || !searchTerm) {
      return [];
    }

    const term = searchTerm.toLowerCase();
    const matches = [];

    for (const [code, description] of Object.entries(this.serviceTypes)) {
      if (description.toLowerCase().includes(term)) {
        matches.push({ code, description });
      }
    }

    return matches;
  }

  /**
   * Get commonly used service type codes for quick reference
   * @returns {Object[]} Array of common service types
   */
  getCommonServiceTypes() {
    const commonCodes = ['1', '30', '33', '35', '47', '86', '88', '98', 'AL', 'MH', 'UC'];
    return this.mapCodesToDescriptions(commonCodes);
  }

  /**
   * Reload service types configuration (useful for updates)
   */
  reload() {
    this.loadServiceTypes();
  }
}

export default ServiceTypeManager;