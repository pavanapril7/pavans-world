import { z } from 'zod';
import { UserRole } from '@prisma/client';

/**
 * User schema for validation
 * Demonstrates Zod schema definition with various validation rules
 */
export const UserSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100, 'First name must be at most 100 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100, 'Last name must be at most 100 characters'),
  role: z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'SUPER_ADMIN']),
  passwordHash: z.string().optional(),
});

/**
 * Infer TypeScript type from Zod schema
 */
export type User = z.infer<typeof UserSchema>;

/**
 * Create user schema (admin only)
 */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Update user schema
 */
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Address schema for validation
 */
export const createAddressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  street: z.string().min(1, 'Street address is required'),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  isDefault: z.boolean().optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;

/**
 * Update address schema
 */
export const updateAddressSchema = z.object({
  label: z.string().min(1, 'Label is required').optional(),
  street: z.string().min(1, 'Street address is required').optional(),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required').optional(),
  state: z.string().min(1, 'State is required').optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

/**
 * Product schema for validation
 * Additional example schema with different validation rules
 */
export const ProductSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
  name: z.string().min(1, 'Product name is required').max(200, 'Product name is too long'),
  price: z.number().positive('Price must be positive'),
  quantity: z.number().int('Quantity must be an integer').nonnegative('Quantity cannot be negative'),
  tags: z.array(z.string()).min(1, 'At least one tag is required').max(10, 'Too many tags'),
});

/**
 * Infer TypeScript type from Product schema
 */
export type Product = z.infer<typeof ProductSchema>;
