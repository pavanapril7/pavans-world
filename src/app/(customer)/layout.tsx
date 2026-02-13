import Link from "next/link";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation removed - now in root layout */}
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-4">About</h3>
              <p className="text-gray-600 text-sm">
                Multi-vendor marketplace connecting customers with local vendors
                in Bagalakunte, Bangalore.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/vendors" className="text-gray-600 hover:text-blue-600">
                    Browse Vendors
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className="text-gray-600 hover:text-blue-600">
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="text-gray-600 hover:text-blue-600">
                    My Profile
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Contact</h3>
              <p className="text-gray-600 text-sm">
                Bagalakunte, Bangalore<br />
                Karnataka, India
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
            © 2026 Marketplace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
