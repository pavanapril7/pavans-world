/**
 * Sanitization utilities for user input
 */

/**
 * Sanitize search query to prevent injection attacks
 * - Removes special characters that could be used for SQL injection
 * - Trims whitespace
 * - Limits length
 */
export function sanitizeSearchQuery(query: string | undefined): string {
  if (!query) return '';

  // Trim whitespace
  let sanitized = query.trim();

  // Remove potentially dangerous characters for SQL injection
  // Keep alphanumeric, spaces, hyphens, and underscores
  sanitized = sanitized.replace(/[^\w\s-]/g, '');

  // Limit length to prevent DoS
  const MAX_SEARCH_LENGTH = 100;
  sanitized = sanitized.substring(0, MAX_SEARCH_LENGTH);

  return sanitized;
}

/**
 * Sanitize text content (notes, reasons, etc.)
 * - Removes HTML tags
 * - Trims whitespace
 * - Limits length
 */
export function sanitizeTextContent(content: string, maxLength = 1000): string {
  if (!content) return '';

  // Trim whitespace
  let sanitized = content.trim();

  // Remove script tags and their content (case insensitive, handles newlines)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove HTML tags to prevent XSS
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Limit length
  sanitized = sanitized.substring(0, maxLength);

  return sanitized;
}

/**
 * Sanitize UUID to ensure it's a valid format
 */
export function sanitizeUUID(uuid: string | undefined): string | undefined {
  if (!uuid) return undefined;

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(uuid)) {
    return uuid.toLowerCase();
  }

  return undefined;
}

/**
 * Sanitize date string to ensure it's a valid ISO date
 */
export function sanitizeDate(date: string | undefined): string | undefined {
  if (!date) return undefined;

  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Sanitize enum value to ensure it's in the allowed list
 */
export function sanitizeEnum<T extends string>(
  value: string | undefined,
  allowedValues: readonly T[]
): T | undefined {
  if (!value) return undefined;

  if (allowedValues.includes(value as T)) {
    return value as T;
  }

  return undefined;
}
