'use client';

import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import DeliveryNotificationListener from "@/components/DeliveryNotificationListener";

export default function DeliveryPartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* WebSocket notification listener */}
      <DeliveryNotificationListener />
      
      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
      
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
                Delivery partner portal for the multi-vendor marketplace platform.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/delivery/available" className="text-gray-600 hover:text-green-600">
                    Available Deliveries
                  </Link>
                </li>
                <li>
                  <Link href="/delivery/active" className="text-gray-600 hover:text-green-600">
                    Active Deliveries
                  </Link>
                </li>
                <li>
                  <Link href="/delivery/history" className="text-gray-600 hover:text-green-600">
                    Delivery History
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Support</h3>
              <p className="text-gray-600 text-sm">
                Need help? Contact support<br />
                Available 24/7
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
