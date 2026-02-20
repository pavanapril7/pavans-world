/**
 * Unit tests for service area Zod schemas
 * Tests polygon validation and service area input validation
 */

import {
  polygonSchema,
  createServiceAreaSchema,
  updateServiceAreaSchema,
  validateAddressSchema,
  validatePincodeSchema,
} from '@/schemas/service-area.schema';
import { ServiceAreaStatus } from '@prisma/client';

describe('Service Area Schemas', () => {
  describe('polygonSchema', () => {
    it('should validate a valid polygon', () => {
      const validPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [72.8777, 19.0760],
            [72.8800, 19.0760],
            [72.8800, 19.0780],
            [72.8777, 19.0780],
            [72.8777, 19.0760], // Closed polygon
          ],
        ],
      };

      const result = polygonSchema.safeParse(validPolygon);
      expect(result.success).toBe(true);
    });

    it('should reject polygon with invalid type', () => {
      const invalidPolygon = {
        type: 'Point',
        coordinates: [
          [
            [72.8777, 19.0760],
            [72.8800, 19.0760],
            [72.8800, 19.0780],
            [72.8777, 19.0760],
          ],
        ],
      };

      const result = polygonSchema.safeParse(invalidPolygon);
      expect(result.success).toBe(false);
    });

    it('should reject polygon with fewer than 4 points', () => {
      const invalidPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [72.8777, 19.0760],
            [72.8800, 19.0760],
            [72.8777, 19.0760],
          ],
        ],
      };

      const result = polygonSchema.safeParse(invalidPolygon);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 4 points');
      }
    });

    it('should reject polygon with invalid longitude', () => {
      const invalidPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [200, 19.0760], // Invalid longitude
            [72.8800, 19.0760],
            [72.8800, 19.0780],
            [72.8777, 19.0780],
            [200, 19.0760],
          ],
        ],
      };

      const result = polygonSchema.safeParse(invalidPolygon);
      expect(result.success).toBe(false);
    });

    it('should reject polygon with invalid latitude', () => {
      const invalidPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [72.8777, 100], // Invalid latitude
            [72.8800, 19.0760],
            [72.8800, 19.0780],
            [72.8777, 19.0780],
            [72.8777, 100],
          ],
        ],
      };

      const result = polygonSchema.safeParse(invalidPolygon);
      expect(result.success).toBe(false);
    });

    it('should reject polygon with no rings', () => {
      const invalidPolygon = {
        type: 'Polygon',
        coordinates: [],
      };

      const result = polygonSchema.safeParse(invalidPolygon);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least one ring');
      }
    });

    it('should validate polygon with multiple rings (holes)', () => {
      const polygonWithHole = {
        type: 'Polygon',
        coordinates: [
          // Outer ring
          [
            [72.8777, 19.0760],
            [72.8900, 19.0760],
            [72.8900, 19.0880],
            [72.8777, 19.0880],
            [72.8777, 19.0760],
          ],
          // Inner ring (hole)
          [
            [72.8800, 19.0780],
            [72.8850, 19.0780],
            [72.8850, 19.0830],
            [72.8800, 19.0830],
            [72.8800, 19.0780],
          ],
        ],
      };

      const result = polygonSchema.safeParse(polygonWithHole);
      expect(result.success).toBe(true);
    });
  });

  describe('createServiceAreaSchema', () => {
    it('should validate a valid service area creation request', () => {
      const validInput = {
        name: 'Mumbai Central',
        city: 'Mumbai',
        state: 'Maharashtra',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [72.8777, 19.0760],
              [72.8800, 19.0760],
              [72.8800, 19.0780],
              [72.8777, 19.0780],
              [72.8777, 19.0760],
            ],
          ],
        },
        pincodes: ['400001', '400002'],
        status: ServiceAreaStatus.ACTIVE,
      };

      const result = createServiceAreaSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate service area without pincodes', () => {
      const validInput = {
        name: 'Mumbai Central',
        city: 'Mumbai',
        state: 'Maharashtra',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [72.8777, 19.0760],
              [72.8800, 19.0760],
              [72.8800, 19.0780],
              [72.8777, 19.0780],
              [72.8777, 19.0760],
            ],
          ],
        },
      };

      const result = createServiceAreaSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject service area without name', () => {
      const invalidInput = {
        city: 'Mumbai',
        state: 'Maharashtra',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [72.8777, 19.0760],
              [72.8800, 19.0760],
              [72.8800, 19.0780],
              [72.8777, 19.0760],
            ],
          ],
        },
      };

      const result = createServiceAreaSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject service area without boundary', () => {
      const invalidInput = {
        name: 'Mumbai Central',
        city: 'Mumbai',
        state: 'Maharashtra',
      };

      const result = createServiceAreaSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject service area with invalid pincode format', () => {
      const invalidInput = {
        name: 'Mumbai Central',
        city: 'Mumbai',
        state: 'Maharashtra',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [72.8777, 19.0760],
              [72.8800, 19.0760],
              [72.8800, 19.0780],
              [72.8777, 19.0780],
              [72.8777, 19.0760],
            ],
          ],
        },
        pincodes: ['40000', '400002'], // Invalid: 5 digits instead of 6
      };

      const result = createServiceAreaSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('6 digits');
      }
    });

    it('should reject service area with name too long', () => {
      const invalidInput = {
        name: 'A'.repeat(256), // Too long
        city: 'Mumbai',
        state: 'Maharashtra',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [72.8777, 19.0760],
              [72.8800, 19.0760],
              [72.8800, 19.0780],
              [72.8777, 19.0780],
              [72.8777, 19.0760],
            ],
          ],
        },
      };

      const result = createServiceAreaSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('too long');
      }
    });
  });

  describe('updateServiceAreaSchema', () => {
    it('should validate a valid service area update request', () => {
      const validInput = {
        name: 'Mumbai Central Updated',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [72.8777, 19.0760],
              [72.8800, 19.0760],
              [72.8800, 19.0780],
              [72.8777, 19.0780],
              [72.8777, 19.0760],
            ],
          ],
        },
        status: ServiceAreaStatus.INACTIVE,
      };

      const result = updateServiceAreaSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate update with only name', () => {
      const validInput = {
        name: 'Mumbai Central Updated',
      };

      const result = updateServiceAreaSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate update with only boundary', () => {
      const validInput = {
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [72.8777, 19.0760],
              [72.8800, 19.0760],
              [72.8800, 19.0780],
              [72.8777, 19.0780],
              [72.8777, 19.0760],
            ],
          ],
        },
      };

      const result = updateServiceAreaSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate empty update object', () => {
      const validInput = {};

      const result = updateServiceAreaSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject update with invalid boundary', () => {
      const invalidInput = {
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [72.8777, 19.0760],
              [72.8800, 19.0760], // Only 2 points
            ],
          ],
        },
      };

      const result = updateServiceAreaSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('validateAddressSchema', () => {
    it('should validate a valid address', () => {
      const validInput = {
        street: '123 Main Street',
        landmark: 'Near Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      };

      const result = validateAddressSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate address without landmark', () => {
      const validInput = {
        street: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      };

      const result = validateAddressSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject address with invalid pincode', () => {
      const invalidInput = {
        street: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '40000', // Invalid: 5 digits
      };

      const result = validateAddressSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('validatePincodeSchema', () => {
    it('should validate a valid pincode', () => {
      const validInput = {
        pincode: '400001',
      };

      const result = validatePincodeSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid pincode format', () => {
      const invalidInput = {
        pincode: '40000',
      };

      const result = validatePincodeSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric pincode', () => {
      const invalidInput = {
        pincode: 'ABCDEF',
      };

      const result = validatePincodeSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});
