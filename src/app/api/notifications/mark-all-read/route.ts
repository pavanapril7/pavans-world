/**
 * Mark All Notifications as Read API Route
 * PUT /api/notifications/mark-all-read - Mark all notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/notification.service';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Mark all notifications as read
    const count = await notificationService.markAllAsRead(authResult.user.id);

    return NextResponse.json({
      success: true,
      message: `${count} notification(s) marked as read`,
      count,
    });
  } catch (error) {
    console.error('[PUT /api/notifications/mark-all-read] Error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to mark notifications as read',
        },
      },
      { status: 500 }
    );
  }
}
