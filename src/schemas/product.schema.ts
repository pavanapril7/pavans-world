import { z } from 'zod';
import { ProductStatus } from '@prisma/client';

// Create product schema
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  price: z.coerce.number().positive('Price must be positive').multipleOf(0.01, 'Price must have at most 2 decimal places'),
  imageUrl: z.string().max(500, 'Image URL too long').refine(
    (val) => val === '' || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'),
    'Image URL must be a valid URL or relative path'
  ).optional(),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.AVAILABLE),
});

// Update product schema
export const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long').optional(),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long').optional(),
  price: z.coerce.number().positive('Price must be positive').multipleOf(0.01, 'Price must have at most 2 decimal places').optional(),
  imageUrl: z.string().min(1, 'Image URL is required').max(500, 'Image URL too long').refine(
    (val) => val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'),
    'Image URL must be a valid URL or relative path'
  ).optional(),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long').optional(),
  status: z.nativeEnum(ProductStatus).optional(),
});

// Update product availability schema
export const updateProductAvailabilitySchema = z.object({
  status: z.nativeEnum(ProductStatus),
});

// Product filters schema
export const productFiltersSchema = z.object({
  status: z.nativeEnum(ProductStatus).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateProductAvailabilityInput = z.infer<typeof updateProductAvailabilitySchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
