/**
 * Tests for admin order validation schemas
 */

import {
  adminOrderFiltersSchema,
  adminOrderStatsFiltersSchema,
  adminCancelOrderSchema,
  adminAddNoteSchema,
  adminReassignDeliverySchema,
} from '@/schemas/admin-order.schema';
import { OrderStatus } from '@prisma/client';

describe('Admin Order Validation Schemas', () => {
  describe('adminOrderFiltersSchema', () => {
    it('should validate valid filters', () => {
      const validFilters = {
        status: OrderStatus.PENDING,
        vendorId: '123e4567-e89b-12d3-a456-426614174000',
        customerId: '123e4567-e89b-12d3-a456-426614174001',
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.999Z',
        search: 'ORD-001',
        page: '1',
        pageSize: '50',
      };

      const result = adminOrderFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date range (dateFrom > dateTo)', () => {
      const invalidFilters = {
        dateFrom: '2024-12-31T23:59:59.999Z',
        dateTo: '2024-01-01T00:00:00.000Z',
      };

      const result = adminOrderFiltersSchema.safeParse(invalidFilters);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Start date must be before or equal to end date');
      }
    });

    it('should accept equal dates', () => {
      const validFilters = {
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-01-01T23:59:59.999Z',
      };

      const result = adminOrderFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should accept only dateFrom without dateTo', () => {
      const validFilters = {
        dateFrom: '2024-01-01T00:00:00.000Z',
      };

      const result = adminOrderFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should accept only dateTo without dateFrom', () => {
      const validFilters = {
        dateTo: '2024-12-31T23:59:59.999Z',
      };

      const result = adminOrderFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should enforce max page size of 100', () => {
      const filters = {
        pageSize: '200',
      };

      const result = adminOrderFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(100);
      }
    });
  });

  describe('adminOrderStatsFiltersSchema', () => {
    it('should validate valid stats filters', () => {
      const validFilters = {
        status: OrderStatus.DELIVERED,
        vendorId: '123e4567-e89b-12d3-a456-426614174000',
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.999Z',
      };

      const result = adminOrderStatsFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date range', () => {
      const invalidFilters = {
        dateFrom: '2024-12-31T23:59:59.999Z',
        dateTo: '2024-01-01T00:00:00.000Z',
      };

      const result = adminOrderStatsFiltersSchema.safeParse(invalidFilters);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Start date must be before or equal to end date');
      }
    });
  });

  describe('adminCancelOrderSchema', () => {
    it('should validate valid cancellation data', () => {
      const validData = {
        reason: 'Customer requested cancellation',
        notifyCustomer: true,
      };

      const result = adminCancelOrderSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty reason', () => {
      const invalidData = {
        reason: '',
        notifyCustomer: true,
      };

      const result = adminCancelOrderSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject reason exceeding 500 characters', () => {
      const invalidData = {
        reason: 'a'.repeat(501),
        notifyCustomer: true,
      };

      const result = adminCancelOrderSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should default notifyCustomer to true', () => {
      const data = {
        reason: 'Test reason',
      };

      const result = adminCancelOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifyCustomer).toBe(true);
      }
    });
  });

  describe('adminAddNoteSchema', () => {
    it('should validate valid note', () => {
      const validData = {
        content: 'This is an admin note',
      };

      const result = adminAddNoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const invalidData = {
        content: '',
      };

      const result = adminAddNoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding 1000 characters', () => {
      const invalidData = {
        content: 'a'.repeat(1001),
      };

      const result = adminAddNoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('adminReassignDeliverySchema', () => {
    it('should validate valid delivery partner ID', () => {
      const validData = {
        deliveryPartnerId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = adminReassignDeliverySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        deliveryPartnerId: 'not-a-uuid',
      };

      const result = adminReassignDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const invalidData = {
        deliveryPartnerId: '',
      };

      const result = adminReassignDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
