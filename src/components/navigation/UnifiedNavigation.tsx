'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DesktopNav } from './DesktopNav';
import { MobileNav } from './MobileNav';
import { useNavigation } from '@/hooks/useNavigation';
import { navigationConfig, navigationThemes } from './navigationConfig';

/**
 * UnifiedNavigation component - Main navigation wrapper
 * Orchestrates desktop/mobile views and manages navigation state
 */
export function UnifiedNavigation() {
  const { session, loading } = useNavigation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Initialize cart count from cache
  const [cartCount, setCartCount] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('cart_count');
      return cached ? parseInt(cached, 10) : 0;
    }
    return 0;
  });
  
  // Memoized mobile menu toggle handler
  const handleMobileMenuToggle = useCallback((open: boolean) => {
    setIsMobileMenuOpen(open);
  }, []);
  
  // Determine user role
  const role = session?.user?.role || 'GUEST';
  
  // Memoize navigation items and theme to avoid recalculation
  const navItems = useMemo(
    () => navigationConfig[role] || navigationConfig.GUEST,
    [role]
  );
  
  const theme = useMemo(
    () => navigationThemes[role] || navigationThemes.GUEST,
    [role]
  );
  
  // Get theme class based on role (memoized)
  const themeClass = useMemo(() => {
    switch (role) {
      case 'CUSTOMER':
        return 'theme-customer';
      case 'SUPER_ADMIN':
        return 'theme-admin';
      case 'VENDOR':
        return 'theme-vendor';
      case 'DELIVERY_PARTNER':
        return 'theme-delivery';
      case 'GUEST':
      default:
        return 'theme-guest';
    }
  }, [role]);
  
  // Memoized cart count fetching function with caching
  const fetchCartCount = useCallback(async () => {
    try {
      const response = await fetch('/api/cart/items');
      if (response.ok) {
        const result = await response.json();
        const count = result.data?.items?.length || 0;
        setCartCount(count);
        // Cache cart count in sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('cart_count', count.toString());
        }
      } else {
        setCartCount(0);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('cart_count');
        }
      }
    } catch (error) {
      console.error('Failed to fetch cart count:', error);
      setCartCount(0);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cart_count');
      }
    }
  }, []);
  
  // Fetch cart count for badge (only for customers)
  useEffect(() => {
    if (role === 'CUSTOMER') {
      fetchCartCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);
  
  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      if (role === 'CUSTOMER') {
        fetchCartCount();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', handleCartUpdate);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cartUpdated', handleCartUpdate);
      }
    };
  }, [role, fetchCartCount]);
  
  // Show loading skeleton
  if (loading) {
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="hidden md:flex space-x-4">
                <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
                <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
                <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </header>
    );
  }
  
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      
      <header className={`bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm ${themeClass}`} role="banner">
        <nav className="container mx-auto px-4" aria-label="Main navigation">
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <DesktopNav
              items={navItems}
              theme={theme}
              session={session}
              cartCount={cartCount}
            />
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden">
            <MobileNav
              items={navItems}
              theme={theme}
              session={session}
              cartCount={cartCount}
              isOpen={isMobileMenuOpen}
              onToggle={handleMobileMenuToggle}
            />
          </div>
        </nav>
      </header>
    </>
  );
}
