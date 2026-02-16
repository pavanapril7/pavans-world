import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates required environment variables at runtime
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().min(1).refine((val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'NEXT_PUBLIC_APP_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Authentication
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

  // SMS Gateway (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Supabase Storage (Production only)
  SUPABASE_URL: z.string().optional().refine((val) => {
    if (!val) return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

/**
 * Validates environment variables against the schema
 * Throws an error if validation fails
 */
export function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);

    // Additional validation: Supabase credentials required in production
    if (parsed.NODE_ENV === 'production') {
      if (!parsed.SUPABASE_URL || !parsed.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error(
          'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production environment'
        );
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Validated environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
