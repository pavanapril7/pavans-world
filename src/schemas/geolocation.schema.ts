import { z } from 'zod';

/**
 * Coordinate validation
 * Latitude: -90 to 90
 * Longitude: -180 to 180
 */
const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

/**
 * Location update schema for delivery partners
 * Used when delivery partners update their location during active delivery
 */
export const locationUpdateSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

/**
 * Vendor location schema
 * Used when vendors set or update their business location
 */
export const vendorLocationSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  serviceRadiusKm: z
    .number()
    .min(1, 'Service radius must be at least 1 km')
    .max(100, 'Service radius must be at most 100 km'),
});

export type VendorLocation = z.infer<typeof vendorLocationSchema>;

/**
 * Nearby vendors query schema
 * Used for parsing query parameters in GET /api/vendors/nearby
 */
export const nearbyVendorsQuerySchema = z.object({
  latitude: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(latitudeSchema),
  longitude: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(longitudeSchema),
  radius: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : 50))
    .pipe(
      z
        .number()
        .min(1, 'Radius must be at least 1 km')
        .max(100, 'Radius must be at most 100 km')
    ),
});

export type NearbyVendorsQuery = z.infer<typeof nearbyVendorsQuerySchema>;

/**
 * Address with optional coordinates schema
 * Extends the existing address schema with optional latitude/longitude
 */
export const addressWithCoordinatesSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  street: z.string().min(1, 'Street address is required'),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  isDefault: z.boolean().optional(),
});

export type AddressWithCoordinates = z.infer<typeof addressWithCoordinatesSchema>;

/**
 * Update address with coordinates schema
 * Used for PATCH /api/users/[id]/addresses/[addressId]
 */
export const updateAddressWithCoordinatesSchema = z.object({
  label: z.string().min(1, 'Label is required').optional(),
  street: z.string().min(1, 'Street address is required').optional(),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required').optional(),
  state: z.string().min(1, 'State is required').optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateAddressWithCoordinates = z.infer<typeof updateAddressWithCoordinatesSchema>;
