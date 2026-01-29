import { z } from 'zod';
import { ServiceAreaStatus } from '@prisma/client';

export const createServiceAreaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  city: z.string().min(1, 'City is required').max(100, 'City is too long'),
  state: z.string().min(1, 'State is required').max(100, 'State is too long'),
  pincodes: z
    .array(z.string().regex(/^\d{6}$/, 'Each pincode must be 6 digits'))
    .min(1, 'At least one pincode is required'),
  status: z.nativeEnum(ServiceAreaStatus).optional(),
});

export const updateServiceAreaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  city: z.string().min(1, 'City is required').max(100, 'City is too long').optional(),
  state: z.string().min(1, 'State is required').max(100, 'State is too long').optional(),
  pincodes: z
    .array(z.string().regex(/^\d{6}$/, 'Each pincode must be 6 digits'))
    .min(1, 'At least one pincode is required')
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

export type CreateServiceAreaInput = z.infer<typeof createServiceAreaSchema>;
export type UpdateServiceAreaInput = z.infer<typeof updateServiceAreaSchema>;
export type ValidateAddressInput = z.infer<typeof validateAddressSchema>;
export type ValidatePincodeInput = z.infer<typeof validatePincodeSchema>;
