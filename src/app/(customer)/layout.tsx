import Link from "next/link";
import { Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";
import CartBadge from "@/components/CartBadge";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/vendors" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Marketplace</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/vendors"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Browse Vendors
              </Link>
              <Link
                href="/orders"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors flex items-center space-x-1"
              >
                <Package className="w-4 h-4" />
                <span>Orders</span>
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              <CartBadge />
              <Link href="/profile">
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

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
