/**
 * Notifications API Routes
 * GET /api/notifications - List user notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/notification.service';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get notifications
    const notifications = await notificationService.getUserNotifications(
      authResult.user.id,
      {
        unreadOnly,
        limit: Math.min(limit, 100), // Cap at 100
        offset,
      }
    );

    // Get unread count
    const unreadCount = await notificationService.getUnreadCount(
      authResult.user.id
    );

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        total: notifications.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/notifications] Error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch notifications',
        },
      },
      { status: 500 }
    );
  }
}
