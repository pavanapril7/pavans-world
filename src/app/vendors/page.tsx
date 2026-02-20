"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Search, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VendorListWithDistance } from "@/components/VendorListWithDistance";
import { selectSelectedAddress } from "@/lib/redux/slices/locationSlice";

interface VendorWithDistance {
  id: string;
  businessName: string;
  description: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  distanceKm: number;
  isActive: boolean;
  imageUrl: string | null;
  rating: number;
  serviceAreaId: string;
  serviceAreaName: string;
  isWithinServiceRadius: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function VendorsPage() {
  const selectedAddress = useSelector(selectSelectedAddress);
  
  const [vendors, setVendors] = useState<VendorWithDistance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

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
    // If no address is selected, don't fetch vendors
    if (!selectedAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append("latitude", selectedAddress.latitude.toString());
      params.append("longitude", selectedAddress.longitude.toString());
      
      if (selectedCategory) {
        params.append("categoryId", selectedCategory);
      }

      const response = await fetch(`/api/vendors/nearby?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || "Failed to fetch vendors");
        setVendors([]);
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      setError("Failed to fetch vendors. Please try again.");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAddress, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const filteredVendors = vendors.filter((vendor) =>
    vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Browse Vendors</h1>
              <p className="text-gray-600 mt-2">
                Discover local vendors in your area
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Loading...
              </h3>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Vendors</h1>
            <p className="text-gray-600 mt-2">
              Discover local vendors in your area
            </p>
          </div>

          {/* Show prompt if no address is selected */}
          {!selectedAddress ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select Your Delivery Address
              </h3>
              <p className="text-gray-600 mb-4">
                Please select a delivery address from the header to see vendors that deliver to your location.
              </p>
            </div>
          ) : (
            <>
              {/* Search Bar */}
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

              {/* Category Filters */}
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

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-900">Error</h3>
                      <p className="text-sm text-red-800 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor List */}
              <VendorListWithDistance 
                vendors={filteredVendors} 
                isLoading={loading}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
