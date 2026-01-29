import { z } from 'zod';
import { UserRole } from '@prisma/client';

// Registration schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login with password schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Request OTP schema
export const requestOTPSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
});

export type RequestOTPInput = z.infer<typeof requestOTPSchema>;

// Verify OTP schema
export const verifyOTPSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
