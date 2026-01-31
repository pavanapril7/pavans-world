import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authenticate } from '@/middleware/auth.middleware';
import { cookies } from 'next/headers';
import LogoutButton from '@/components/LogoutButton';

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get auth token from cookies
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;

  if (!authToken) {
    redirect('/auth/login');
  }

  // Create a mock request with the auth token
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

  const authResult = await authenticate(mockRequest);

  if (!authResult.authenticated || !authResult.user) {
    redirect('/auth/login');
  }

  if (authResult.user.role !== 'VENDOR') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/vendor/dashboard" className="text-xl font-bold text-gray-900">
                  Vendor Dashboard
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/vendor/dashboard"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/vendors"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Browse Vendors
                </Link>
                <Link
                  href="/vendor/products"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Products
                </Link>
                <Link
                  href="/vendor/orders"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Orders
                </Link>
                <Link
                  href="/vendor/operating-hours"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Operating Hours
                </Link>
                <Link
                  href="/vendor/profile"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Profile
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {authResult.user.firstName} {authResult.user.lastName}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
