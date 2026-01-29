"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

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
        // API returns { vendors: [], pagination: {} }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Vendors</h1>
        <p className="text-gray-600 mt-2">
          Discover local vendors in your area
        </p>
      </div>

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

      {/* Vendors Grid */}
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
  );
}
