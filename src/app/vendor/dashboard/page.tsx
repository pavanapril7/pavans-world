import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { VendorService } from '@/services/vendor.service';
import { OrderService } from '@/services/order.service';
import Link from 'next/link';

export default async function VendorDashboardPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;

  const mockRequest = {
    headers: new Headers({
      cookie: `auth_token=${authToken}`,
    }),
    cookies: {
      get: (name: string) => {
        if (name === 'auth_token') {
          return { value: authToken };
        }
        return undefined;
      },
    },
  } as unknown;

  const authResult = await authenticate(mockRequest as NextRequest);
  const user = authResult.user!;

  // Get vendor profile
  const vendor = await VendorService.getVendorByUserId(user.id);

  if (!vendor) {
    return (
      <div className="px-4 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No vendor profile found. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Get recent orders
  const ordersResult = await OrderService.listOrders(user.id, user.role, {}, 1, 5);

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Vendor Status */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Business Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Business Name</p>
            <p className="text-lg font-medium">{vendor.businessName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-lg font-medium">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vendor.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : vendor.status === 'PENDING_APPROVAL'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {vendor.status}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Category</p>
            <p className="text-lg font-medium">{vendor.category.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-lg font-medium">{vendor.totalOrders}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rating</p>
            <p className="text-lg font-medium">
              {vendor.rating ? `${Number(vendor.rating).toFixed(1)} / 5.0` : 'No ratings yet'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Service Area</p>
            <p className="text-lg font-medium">{vendor.serviceArea.name}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Orders</h3>
          <p className="text-3xl font-bold text-gray-900">
            {ordersResult.orders.filter((o) => o.status === 'PENDING').length}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Orders</h3>
          <p className="text-3xl font-bold text-gray-900">
            {
              ordersResult.orders.filter(
                (o) =>
                  o.status === 'ACCEPTED' ||
                  o.status === 'PREPARING' ||
                  o.status === 'READY_FOR_PICKUP'
              ).length
            }
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-gray-900">{vendor.totalOrders}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          <Link
            href="/vendor/orders"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View All
          </Link>
        </div>
        {ordersResult.orders.length === 0 ? (
          <p className="text-gray-500">No orders yet</p>
        ) : (
          <div className="space-y-4">
            {ordersResult.orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {order.customer.firstName} {order.customer.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items.length} item(s) • ₹{Number(order.total).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'ACCEPTED' || order.status === 'PREPARING'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'READY_FOR_PICKUP'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/vendor/orders/${order.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
