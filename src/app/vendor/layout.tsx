import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { cookies } from 'next/headers';

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
  } as unknown as NextRequest;

  const authResult = await authenticate(mockRequest);

  if (!authResult.authenticated || !authResult.user) {
    redirect('/auth/login');
  }

  if (authResult.user.role !== 'VENDOR') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation removed - now in root layout */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
