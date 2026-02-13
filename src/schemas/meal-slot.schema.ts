import { z } from 'zod';

/**
 * Schema for validating time format (HH:MM)
 */
export const timeFormatSchema = z
  .string()
  .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)');

/**
 * Schema for creating a meal slot
 */
export const createMealSlotSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    startTime: timeFormatSchema,
    endTime: timeFormatSchema,
    cutoffTime: timeFormatSchema,
    timeWindowDuration: z
      .number()
      .int('Time window duration must be an integer')
      .positive('Time window duration must be positive')
      .optional()
      .default(60),
  })
  .refine((data) => data.cutoffTime < data.startTime, {
    message: 'Cutoff time must be before start time',
    path: ['cutoffTime'],
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Start time must be before end time',
    path: ['startTime'],
  });

/**
 * Schema for updating a meal slot
 */
export const updateMealSlotSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  startTime: timeFormatSchema.optional(),
  endTime: timeFormatSchema.optional(),
  cutoffTime: timeFormatSchema.optional(),
  timeWindowDuration: z
    .number()
    .int('Time window duration must be an integer')
    .positive('Time window duration must be positive')
    .optional(),
  isActive: z.boolean().optional(),
});

export type TimeFormat = z.infer<typeof timeFormatSchema>;
export type CreateMealSlotInput = z.infer<typeof createMealSlotSchema>;
export type UpdateMealSlotInput = z.infer<typeof updateMealSlotSchema>;
