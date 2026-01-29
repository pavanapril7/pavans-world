/**
 * Notification API Routes
 * PUT /api/notifications/:id - Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/notification.service';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * PUT /api/notifications/:id
 * Mark a notification as read
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id: notificationId } = await params;

    // Mark notification as read
    const success = await notificationService.markAsRead(
      notificationId,
      authResult.user.id
    );

    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Notification not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('[PUT /api/notifications/:id] Error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to mark notification as read',
        },
      },
      { status: 500 }
    );
  }
}
