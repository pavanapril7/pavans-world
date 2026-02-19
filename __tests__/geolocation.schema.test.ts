import {
  locationUpdateSchema,
  vendorLocationSchema,
  nearbyVendorsQuerySchema,
  addressWithCoordinatesSchema,
  updateAddressWithCoordinatesSchema,
} from '@/schemas/geolocation.schema';

describe('Geolocation Schemas', () => {
  describe('locationUpdateSchema', () => {
    it('should accept valid coordinates', () => {
      const validData = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      const result = locationUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept boundary coordinates', () => {
      const boundaries = [
        { latitude: -90, longitude: -180 },
        { latitude: 90, longitude: 180 },
        { latitude: 0, longitude: 0 },
      ];

      boundaries.forEach((coords) => {
        const result = locationUpdateSchema.safeParse(coords);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid latitude', () => {
      const invalidLatitudes = [
        { latitude: -91, longitude: 0 },
        { latitude: 91, longitude: 0 },
        { latitude: -100, longitude: 0 },
        { latitude: 100, longitude: 0 },
      ];

      invalidLatitudes.forEach((coords) => {
        const result = locationUpdateSchema.safeParse(coords);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Latitude must be between -90 and 90');
        }
      });
    });

    it('should reject invalid longitude', () => {
      const invalidLongitudes = [
        { latitude: 0, longitude: -181 },
        { latitude: 0, longitude: 181 },
        { latitude: 0, longitude: -200 },
        { latitude: 0, longitude: 200 },
      ];

      invalidLongitudes.forEach((coords) => {
        const result = locationUpdateSchema.safeParse(coords);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Longitude must be between -180 and 180');
        }
      });
    });

    it('should reject missing fields', () => {
      const missingLatitude = { longitude: -74.0060 };
      const missingLongitude = { latitude: 40.7128 };

      expect(locationUpdateSchema.safeParse(missingLatitude).success).toBe(false);
      expect(locationUpdateSchema.safeParse(missingLongitude).success).toBe(false);
    });
  });

  describe('vendorLocationSchema', () => {
    it('should accept valid vendor location', () => {
      const validData = {
        latitude: 40.7128,
        longitude: -74.0060,
        serviceRadiusKm: 10,
      };

      const result = vendorLocationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept boundary service radius values', () => {
      const boundaries = [
        { latitude: 40.7128, longitude: -74.0060, serviceRadiusKm: 1 },
        { latitude: 40.7128, longitude: -74.0060, serviceRadiusKm: 100 },
      ];

      boundaries.forEach((data) => {
        const result = vendorLocationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject service radius below 1 km', () => {
      const invalidData = {
        latitude: 40.7128,
        longitude: -74.0060,
        serviceRadiusKm: 0.5,
      };

      const result = vendorLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Service radius must be at least 1 km');
      }
    });

    it('should reject service radius above 100 km', () => {
      const invalidData = {
        latitude: 40.7128,
        longitude: -74.0060,
        serviceRadiusKm: 101,
      };

      const result = vendorLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Service radius must be at most 100 km');
      }
    });

    it('should reject missing serviceRadiusKm', () => {
      const invalidData = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      const result = vendorLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('nearbyVendorsQuerySchema', () => {
    it('should parse valid query parameters', () => {
      const validQuery = {
        latitude: '40.7128',
        longitude: '-74.0060',
        radius: '25',
      };

      const result = nearbyVendorsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(40.7128);
        expect(result.data.longitude).toBe(-74.0060);
        expect(result.data.radius).toBe(25);
      }
    });

    it('should use default radius of 50 when not provided', () => {
      const queryWithoutRadius = {
        latitude: '40.7128',
        longitude: '-74.0060',
      };

      const result = nearbyVendorsQuerySchema.safeParse(queryWithoutRadius);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radius).toBe(50);
      }
    });

    it('should transform string coordinates to numbers', () => {
      const stringQuery = {
        latitude: '45.5',
        longitude: '-122.6',
        radius: '10',
      };

      const result = nearbyVendorsQuerySchema.safeParse(stringQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.latitude).toBe('number');
        expect(typeof result.data.longitude).toBe('number');
        expect(typeof result.data.radius).toBe('number');
      }
    });

    it('should reject invalid string coordinates', () => {
      const invalidQuery = {
        latitude: 'invalid',
        longitude: '-74.0060',
      };

      const result = nearbyVendorsQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should reject radius outside valid range', () => {
      const tooSmall = {
        latitude: '40.7128',
        longitude: '-74.0060',
        radius: '0.5',
      };

      const tooLarge = {
        latitude: '40.7128',
        longitude: '-74.0060',
        radius: '101',
      };

      expect(nearbyVendorsQuerySchema.safeParse(tooSmall).success).toBe(false);
      expect(nearbyVendorsQuerySchema.safeParse(tooLarge).success).toBe(false);
    });
  });

  describe('addressWithCoordinatesSchema', () => {
    it('should accept address with coordinates', () => {
      const validAddress = {
        label: 'Home',
        street: '123 Main St',
        landmark: 'Near Park',
        city: 'New York',
        state: 'NY',
        pincode: '100001',
        latitude: 40.7128,
        longitude: -74.0060,
        isDefault: true,
      };

      const result = addressWithCoordinatesSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should accept address without coordinates', () => {
      const addressWithoutCoords = {
        label: 'Home',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '100001',
      };

      const result = addressWithCoordinatesSchema.safeParse(addressWithoutCoords);
      expect(result.success).toBe(true);
    });

    it('should reject invalid pincode format', () => {
      const invalidPincode = {
        label: 'Home',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '12345', // Only 5 digits
      };

      const result = addressWithCoordinatesSchema.safeParse(invalidPincode);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Pincode must be 6 digits');
      }
    });

    it('should reject invalid coordinates in address', () => {
      const invalidCoords = {
        label: 'Home',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '100001',
        latitude: 91, // Invalid
        longitude: -74.0060,
      };

      const result = addressWithCoordinatesSchema.safeParse(invalidCoords);
      expect(result.success).toBe(false);
    });

    it('should require all mandatory fields', () => {
      const missingFields = {
        label: 'Home',
        // Missing street, city, state, pincode
      };

      const result = addressWithCoordinatesSchema.safeParse(missingFields);
      expect(result.success).toBe(false);
    });
  });

  describe('updateAddressWithCoordinatesSchema', () => {
    it('should accept partial address updates', () => {
      const partialUpdate = {
        label: 'Work',
        latitude: 40.7589,
      };

      const result = updateAddressWithCoordinatesSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should accept empty update object', () => {
      const emptyUpdate = {};

      const result = updateAddressWithCoordinatesSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate coordinates when provided', () => {
      const invalidUpdate = {
        latitude: 91, // Invalid
      };

      const result = updateAddressWithCoordinatesSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should validate pincode format when provided', () => {
      const invalidPincode = {
        pincode: '123', // Too short
      };

      const result = updateAddressWithCoordinatesSchema.safeParse(invalidPincode);
      expect(result.success).toBe(false);
    });
  });
});
