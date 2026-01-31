import Link from "next/link";
import { Users, Store, MapPin, Tag, BarChart3, Shield, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";

export default function AdminLayout({
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
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Admin Portal</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/admin/dashboard"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors flex items-center space-x-1"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/admin/users"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors flex items-center space-x-1"
              >
                <Users className="w-4 h-4" />
                <span>Users</span>
              </Link>
              <Link
                href="/admin/vendors"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors flex items-center space-x-1"
              >
                <Store className="w-4 h-4" />
                <span>Vendors</span>
              </Link>
              <Link
                href="/admin/products"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors flex items-center space-x-1"
              >
                <Package className="w-4 h-4" />
                <span>Products</span>
              </Link>
              <Link
                href="/admin/service-areas"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors flex items-center space-x-1"
              >
                <MapPin className="w-4 h-4" />
                <span>Service Areas</span>
              </Link>
              <Link
                href="/admin/categories"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors flex items-center space-x-1"
              >
                <Tag className="w-4 h-4" />
                <span>Categories</span>
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              <Link href="/admin/profile">
                <Button variant="ghost" size="sm">
                  Profile
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
          <div className="text-center text-gray-600 text-sm">
            © 2026 Marketplace Admin Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
