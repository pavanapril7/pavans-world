import { z } from 'zod';
import { ServiceAreaStatus } from '@prisma/client';

/**
 * GeoJSON Polygon coordinate schema
 * Validates coordinate pairs [longitude, latitude]
 */
const coordinateSchema = z.tuple([
  z.number().min(-180).max(180), // longitude
  z.number().min(-90).max(90),   // latitude
]);

/**
 * GeoJSON Polygon schema
 * Validates polygon structure with coordinate rings
 */
export const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z
    .array(
      z.array(coordinateSchema).min(4, 'Polygon ring must have at least 4 points (including closure)')
    )
    .min(1, 'Polygon must have at least one ring'),
});

/**
 * Create service area schema with polygon boundary
 */
export const createServiceAreaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  city: z.string().min(1, 'City is required').max(100, 'City is too long'),
  state: z.string().min(1, 'State is required').max(100, 'State is too long'),
  boundary: polygonSchema,
  pincodes: z
    .array(z.string().regex(/^\d{6}$/, 'Each pincode must be 6 digits'))
    .optional(),
  status: z.nativeEnum(ServiceAreaStatus).optional(),
});

/**
 * Update service area schema with optional polygon boundary
 */
export const updateServiceAreaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  city: z.string().min(1, 'City is required').max(100, 'City is too long').optional(),
  state: z.string().min(1, 'State is required').max(100, 'State is too long').optional(),
  boundary: polygonSchema.optional(),
  pincodes: z
    .array(z.string().regex(/^\d{6}$/, 'Each pincode must be 6 digits'))
    .optional(),
  status: z.nativeEnum(ServiceAreaStatus).optional(),
});

export const validateAddressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

export const validatePincodeSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

export type PolygonType = z.infer<typeof polygonSchema>;
export type CreateServiceAreaInput = z.infer<typeof createServiceAreaSchema>;
export type UpdateServiceAreaInput = z.infer<typeof updateServiceAreaSchema>;
export type ValidateAddressInput = z.infer<typeof validateAddressSchema>;
export type ValidatePincodeInput = z.infer<typeof validatePincodeSchema>;
