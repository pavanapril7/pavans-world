"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Star, MapPin, Clock, Plus, Minus, ShoppingCart, Package, User, Users, Store, Tag, BarChart3, Shield, History, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";
import CartBadge from "@/components/CartBadge";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  status: string;
  category: string;
}

interface Vendor {
  id: string;
  businessName: string;
  description: string;
  rating: number;
  totalOrders: number;
  status: string;
  category: {
    name: string;
  };
  serviceArea: {
    name: string;
  };
  operatingHours: Array<{
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
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

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.vendorId as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    fetchSession();
    fetchVendor();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      } else {
        // Session is invalid or expired - set a guest session
        setSession({ user: { id: '', email: '', role: 'GUEST', firstName: 'Guest', lastName: '' } } as UserSession);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      // On error, set a guest session
      setSession({ user: { id: '', email: '', role: 'GUEST', firstName: 'Guest', lastName: '' } } as UserSession);
    }
  };

  const fetchVendor = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`);
      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      }
    } catch (error) {
      console.error("Failed to fetch vendor:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vendors/${vendorId}/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      fetchProducts();
      return;
    }

    try {
      const response = await fetch(
        `/api/vendors/${vendorId}/products/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to search products:", error);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    searchProducts(query);
  };

  const addToCart = async (productId: string) => {
    try {
      const quantity = cartQuantities[productId] || 1;
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });

      if (response.ok) {
        alert("Added to cart!");
        setCartQuantities({ ...cartQuantities, [productId]: 1 });
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        const error = await response.json();
        alert(error.error?.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Failed to add to cart");
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const current = cartQuantities[productId] || 1;
    const newQuantity = Math.max(1, current + delta);
    setCartQuantities({ ...cartQuantities, [productId]: newQuantity });
  };

  const formatPrice = (price: number) => {
    return `₹${Number(price).toFixed(2)}`;
  };

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
                <Link href="/vendors" className="text-gray-700 hover:text-blue-600 font-medium">
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
                  {session.user.firstName} {session.user.lastName}
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
                <Link href="/vendors" className="text-gray-700 hover:text-green-600 font-medium flex items-center space-x-1">
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

    // Guest/unauthenticated user
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
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  };

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50">
        {renderNavigation()}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {vendor.businessName}
                  </h1>
                  {vendor.status === "ACTIVE" ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      Open Now
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      Closed
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{vendor.description}</p>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{Number(vendor.rating).toFixed(1)}</span>
                    <span>({vendor.totalOrders} orders)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{vendor.serviceArea.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{vendor.category.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Products</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
                  >
                    <div className="h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500 text-lg">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/products/${product.id}`)}
                  >
                    <div className="h-48 bg-gray-100 flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 text-4xl">📦</div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                          {product.name}
                        </h3>
                        {product.status === "OUT_OF_STOCK" && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {product.category}
                        </span>
                      </div>

                      {product.status === "AVAILABLE" && (
                        <div className="mt-4 flex items-center space-x-2">
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(product.id, -1);
                              }}
                              className="p-2 hover:bg-gray-100"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-4 py-2 border-x border-gray-300">
                              {cartQuantities[product.id] || 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(product.id, 1);
                              }}
                              className="p-2 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product.id);
                            }}
                            className="flex-1"
                            size="sm"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
