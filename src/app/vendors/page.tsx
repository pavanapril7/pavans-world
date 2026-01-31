"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Star, MapPin, Package, User, Users, Store, Tag, BarChart3, Shield, History, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";
import CartBadge from "@/components/CartBadge";

interface Vendor {
  id: string;
  businessName: string;
  description: string;
  rating: number;
  totalOrders: number;
  status: string;
  category: {
    id: string;
    name: string;
  };
  serviceArea: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface UserSession {
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch categories:", response.status);
        setCategories([]);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategories([]);
    }
  };

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.append("categoryId", selectedCategory);
      }
      params.append("status", "ACTIVE");

      const response = await fetch(`/api/vendors?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      } else {
        console.error("Failed to fetch vendors:", response.status);
        setVendors([]);
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchCategories();
    fetchVendors();
  }, [fetchVendors]);

  const filteredVendors = vendors.filter((vendor) =>
    vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNavigation = () => {
    if (!session) {
      // Show a loading skeleton header while session is being fetched
      return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>
      );
    }

    const role = session.user.role;
    const user = session.user;

    if (role === "CUSTOMER") {
      return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/vendors" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Marketplace</span>
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/vendors" className="text-blue-600 font-medium">
                  Browse Vendors
                </Link>
                <Link href="/orders" className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1">
                  <Package className="w-4 h-4" />
                  <span>Orders</span>
                </Link>
              </nav>
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
      );
    }

    if (role === "SUPER_ADMIN") {
      return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/admin/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Admin Portal</span>
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-700 hover:text-purple-600 font-medium transition-colors flex items-center space-x-1"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/vendors"
                  className="text-gray-700 hover:text-purple-600 font-medium transition-colors flex items-center space-x-1"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Browse Vendors</span>
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
      );
    }

    if (role === "VENDOR") {
      return (
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
                  {user.firstName} {user.lastName}
                </span>
                <LogoutButton />
              </div>
            </div>
          </div>
        </nav>
      );
    }

    if (role === "DELIVERY_PARTNER") {
      return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/delivery/available" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Delivery Partner</span>
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/vendors" className="text-green-600 font-medium flex items-center space-x-1">
                  <Package className="w-4 h-4" />
                  <span>Browse Vendors</span>
                </Link>
                <Link href="/delivery/available" className="text-gray-700 hover:text-green-600 font-medium flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>Available</span>
                </Link>
                <Link href="/delivery/active" className="text-gray-700 hover:text-green-600 font-medium flex items-center space-x-1">
                  <Package className="w-4 h-4" />
                  <span>Active</span>
                </Link>
                <Link href="/delivery/history" className="text-gray-700 hover:text-green-600 font-medium flex items-center space-x-1">
                  <History className="w-4 h-4" />
                  <span>History</span>
                </Link>
              </nav>
              <div className="flex items-center space-x-4">
                <Link href="/delivery/profile">
                  <Button variant="ghost" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Vendors</h1>
            <p className="text-gray-600 mt-2">
              Discover local vendors in your area
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "" ? "default" : "outline"}
              onClick={() => setSelectedCategory("")}
              size="sm"
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                size="sm"
              >
                {category.name}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No vendors found</p>
              <p className="text-gray-400 mt-2">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/vendors/${vendor.id}`}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {vendor.businessName}
                      </h3>
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {vendor.category.name}
                      </span>
                    </div>
                    {vendor.status === "ACTIVE" ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Open
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        Closed
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {vendor.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{Number(vendor.rating).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{vendor.serviceArea.name}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-400">
                    {vendor.totalOrders} orders completed
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
