import { z } from 'zod';
import { VendorStatus, DayOfWeek } from '@prisma/client';

// Create vendor schema
export const createVendorSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  businessName: z.string().min(1, 'Business name is required').max(200, 'Business name too long'),
  categoryId: z.string().uuid('Invalid category ID format'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  serviceAreaId: z.string().uuid('Invalid service area ID format'),
});

// Update vendor schema
export const updateVendorSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(200, 'Business name too long').optional(),
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long').optional(),
  serviceAreaId: z.string().uuid('Invalid service area ID format').optional(),
});

// Update vendor status schema
export const updateVendorStatusSchema = z.object({
  status: z.nativeEnum(VendorStatus),
});

// Vendor filters schema
export const vendorFiltersSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  serviceAreaId: z.string().uuid('Invalid service area ID format').optional(),
  status: z.nativeEnum(VendorStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  icon: z.string().min(1, 'Icon is required').max(200, 'Icon URL too long'),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long').optional(),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long').optional(),
  icon: z.string().min(1, 'Icon is required').max(200, 'Icon URL too long').optional(),
});

// Operating hours schemas
export const operatingHoursItemSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  openTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM'),
  closeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM'),
  isClosed: z.boolean(),
});

export const setOperatingHoursSchema = z.object({
  hours: z.array(operatingHoursItemSchema).min(1, 'At least one day must be specified'),
});

export const updateDayOperatingHoursSchema = z.object({
  openTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM'),
  closeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM'),
  isClosed: z.boolean(),
});

// Type exports
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type UpdateVendorStatusInput = z.infer<typeof updateVendorStatusSchema>;
export type VendorFiltersInput = z.infer<typeof vendorFiltersSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type SetOperatingHoursInput = z.infer<typeof setOperatingHoursSchema>;
export type UpdateDayOperatingHoursInput = z.infer<typeof updateDayOperatingHoursSchema>;
