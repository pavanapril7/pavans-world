import { z } from 'zod';

/**
 * Schema for updating fulfillment configuration
 */
export const updateFulfillmentConfigSchema = z
  .object({
    eatInEnabled: z.boolean().optional(),
    pickupEnabled: z.boolean().optional(),
    deliveryEnabled: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // At least one method must be enabled
      // If no fields are provided, validation passes (no update)
      const values = Object.values(data);
      if (values.length === 0) return true;
      
      // If any field is explicitly set, at least one must be true
      const hasExplicitValues = Object.keys(data).length > 0;
      if (!hasExplicitValues) return true;
      
      // Check if at least one is true
      return Object.values(data).some((v) => v === true);
    },
    {
      message: 'At least one fulfillment method must be enabled',
    }
  );

export type UpdateFulfillmentConfigInput = z.infer<typeof updateFulfillmentConfigSchema>;
