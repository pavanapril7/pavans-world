import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate and check for SUPER_ADMIN role
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    if (authResult.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: { message: 'Forbidden: Admin access required' } },
        { status: 403 }
      );
    }

    // Fetch dashboard statistics
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalVendors,
      activeVendors,
      pendingVendors,
      totalServiceAreas,
      totalOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'INACTIVE' } }),
      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: 'ACTIVE' } }),
      prisma.vendor.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.serviceArea.count(),
      prisma.order.count(),
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalVendors,
      activeVendors,
      pendingVendors,
      totalServiceAreas,
      totalOrders,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch dashboard statistics' } },
      { status: 500 }
    );
  }
}
