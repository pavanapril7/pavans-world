'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface VendorListWithDistanceProps {
  vendors: VendorWithDistance[];
  isLoading?: boolean;
}

/**
 * VendorListWithDistance component
 * Displays a list of vendors with distance information
 * Vendors are already sorted by distance from the API
 */
export function VendorListWithDistance({ vendors, isLoading = false }: VendorListWithDistanceProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="w-full h-48 bg-gray-200 rounded-lg mb-4" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No vendors available in your area
        </h3>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t find any vendors that deliver to your selected address.
          Try selecting a different address or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vendors.map((vendor) => (
        <Link
          key={vendor.id}
          href={`/vendors/${vendor.id}`}
          className="bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200 overflow-hidden group"
        >
          {/* Vendor Image */}
          <div className="relative w-full h-48 bg-gray-100">
            {vendor.imageUrl ? (
              <Image
                src={vendor.imageUrl}
                alt={vendor.businessName}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="w-16 h-16 text-gray-400" />
              </div>
            )}
            
            {/* Distance Badge */}
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-gray-900">
                  {vendor.distanceKm.toFixed(1)} km
                </span>
              </div>
            </div>
          </div>

          {/* Vendor Info */}
          <div className="p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                {vendor.businessName}
              </h3>
              
              {/* Rating */}
              {vendor.rating > 0 && (
                <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {vendor.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {vendor.description || 'No description available'}
            </p>

            {/* Service Area */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {vendor.serviceAreaName}
              </span>
              <span>
                Delivers up to {vendor.serviceRadiusKm} km
              </span>
            </div>

            {/* View Button */}
            <Button 
              className="w-full"
              variant="default"
              size="sm"
            >
              View Menu
            </Button>
          </div>
        </Link>
      ))}
    </div>
  );
}
