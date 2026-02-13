'use client';

import { memo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserSession } from './navigation-types';

interface NavActionsProps {
  session: UserSession | null;
  cartCount?: number;
  compact?: boolean;
}

/**
 * NavActions component displays right-side actions
 * Includes cart badge (for customers), user profile, and logout button
 */
function NavActionsComponent({ session, cartCount = 0, compact = false }: NavActionsProps) {
  const router = useRouter();
  
  // Memoized logout handler
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Clear all session storage and force full page reload
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);
  
  // Don't show actions for guest users
  if (!session || session.user.role === 'GUEST') {
    return null;
  }
  
  const isCustomer = session.user.role === 'CUSTOMER';
  
  return (
    <div className={`flex items-center ${compact ? 'space-x-2' : 'space-x-4'}`}>
      {/* Cart Badge - Only for customers */}
      {isCustomer && (
        <Link href="/cart" className="relative" aria-label={`Shopping cart with ${cartCount} items`}>
          <Button 
            variant="ghost" 
            size={compact ? 'sm' : 'default'}
            className="relative"
          >
            <ShoppingCart className={compact ? 'w-5 h-5' : 'w-5 h-5'} />
            {cartCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center shadow-md ring-2 ring-white transition-transform hover:scale-110"
                aria-label={`${cartCount} items in cart`}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Button>
        </Link>
      )}
      
      {/* User Profile */}
      <Link href="/profile">
        <Button 
          variant="ghost" 
          size={compact ? 'sm' : 'default'}
        >
          <User className={compact ? 'w-5 h-5' : 'w-5 h-5'} />
          {!compact && (
            <span className="ml-2 hidden md:inline">
              {session.user.firstName || 'Profile'}
            </span>
          )}
        </Button>
      </Link>
      
      {/* Logout Button */}
      <Button 
        variant="ghost" 
        size={compact ? 'sm' : 'default'}
        onClick={handleLogout}
      >
        <LogOut className={compact ? 'w-5 h-5' : 'w-5 h-5'} />
        {!compact && (
          <span className="ml-2 hidden md:inline">Logout</span>
        )}
      </Button>
    </div>
  );
}

// Memoized export to prevent unnecessary re-renders
export const NavActions = memo(NavActionsComponent);
