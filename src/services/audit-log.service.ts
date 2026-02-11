import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AuditLogData {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Service for audit logging
 */
export class AuditLogService {
  /**
   * Create an audit log entry
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          details: (data.details || {}) as Prisma.InputJsonValue,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging should not break the main flow
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getLogsForEntity(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get audit logs for a specific user
   */
  static async getLogsForUser(userId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get audit logs by action type
   */
  static async getLogsByAction(action: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: {
        action,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }
}
