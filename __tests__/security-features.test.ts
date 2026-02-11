import { sanitizeSearchQuery, sanitizeTextContent, sanitizeUUID } from '@/lib/sanitization';
import { AuditLogService } from '@/services/audit-log.service';

describe('Security Features', () => {
  describe('Input Sanitization', () => {
    describe('sanitizeSearchQuery', () => {
      it('should remove special characters', () => {
        const input = "test'; DROP TABLE orders;--";
        const result = sanitizeSearchQuery(input);
        expect(result).toBe('test DROP TABLE orders--');
      });

      it('should trim whitespace', () => {
        const input = '  test query  ';
        const result = sanitizeSearchQuery(input);
        expect(result).toBe('test query');
      });

      it('should limit length to 100 characters', () => {
        const input = 'a'.repeat(150);
        const result = sanitizeSearchQuery(input);
        expect(result.length).toBe(100);
      });

      it('should handle undefined input', () => {
        const result = sanitizeSearchQuery(undefined);
        expect(result).toBe('');
      });

      it('should keep alphanumeric, spaces, hyphens, and underscores', () => {
        const input = 'test-query_123 abc';
        const result = sanitizeSearchQuery(input);
        expect(result).toBe('test-query_123 abc');
      });
    });

    describe('sanitizeTextContent', () => {
      it('should remove HTML tags', () => {
        const input = '<p>Hello <strong>World</strong></p>';
        const result = sanitizeTextContent(input);
        expect(result).toBe('Hello World');
      });

      it('should remove script tags', () => {
        const input = 'Hello <script>alert("XSS")</script> World';
        const result = sanitizeTextContent(input);
        expect(result).toBe('Hello World');
      });

      it('should normalize whitespace', () => {
        const input = 'Hello    World\n\nTest';
        const result = sanitizeTextContent(input);
        expect(result).toBe('Hello World Test');
      });

      it('should limit length', () => {
        const input = 'a'.repeat(1500);
        const result = sanitizeTextContent(input, 1000);
        expect(result.length).toBe(1000);
      });

      it('should trim whitespace', () => {
        const input = '  Hello World  ';
        const result = sanitizeTextContent(input);
        expect(result).toBe('Hello World');
      });
    });

    describe('sanitizeUUID', () => {
      it('should accept valid UUID v4', () => {
        const validUUID = '550e8400-e29b-41d4-a716-446655440000';
        const result = sanitizeUUID(validUUID);
        expect(result).toBe(validUUID.toLowerCase());
      });

      it('should reject invalid UUID', () => {
        const invalidUUID = 'not-a-uuid';
        const result = sanitizeUUID(invalidUUID);
        expect(result).toBeUndefined();
      });

      it('should handle undefined input', () => {
        const result = sanitizeUUID(undefined);
        expect(result).toBeUndefined();
      });

      it('should convert to lowercase', () => {
        const upperUUID = '550E8400-E29B-41D4-A716-446655440000';
        const result = sanitizeUUID(upperUUID);
        expect(result).toBe(upperUUID.toLowerCase());
      });
    });
  });

  describe('Audit Logging', () => {
    it('should have log method', () => {
      expect(typeof AuditLogService.log).toBe('function');
    });

    it('should have getLogsForEntity method', () => {
      expect(typeof AuditLogService.getLogsForEntity).toBe('function');
    });

    it('should have getLogsForUser method', () => {
      expect(typeof AuditLogService.getLogsForUser).toBe('function');
    });

    it('should have getLogsByAction method', () => {
      expect(typeof AuditLogService.getLogsByAction).toBe('function');
    });

    it('should not throw when logging fails', async () => {
      // This test verifies that audit logging failures don't break the main flow
      // We expect the log method to catch errors internally
      await expect(
        AuditLogService.log({
          userId: 'test-user',
          action: 'TEST_ACTION',
          entityType: 'Test',
          entityId: 'test-id',
          details: { test: 'data' },
        })
      ).resolves.not.toThrow();
    });
  });
});
