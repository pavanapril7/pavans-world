'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { NavigationTheme } from './navigation-types';

interface NavLogoProps {
  theme: NavigationTheme;
}

/**
 * NavLogo component displays the role-specific logo with icon and text
 * Links to the appropriate home page based on the user's role
 */
function NavLogoComponent({ theme }: NavLogoProps) {
  const { logoColor, logoIcon: Icon, logoText } = theme;
  
  // Memoize home path calculation
  const homePath = useMemo(() => {
    if (logoText.includes('Admin')) return '/admin/dashboard';
    if (logoText.includes('Vendor')) return '/vendor/dashboard';
    if (logoText.includes('Delivery')) return '/delivery/available';
    return '/';
  }, [logoText]);
  
  return (
    <Link 
      href={homePath} 
      className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
    >
      <div className={`${logoColor} p-2 rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-xl font-bold text-gray-900">
        {logoText}
      </span>
    </Link>
  );
}

// Memoized export to prevent unnecessary re-renders
export const NavLogo = memo(NavLogoComponent);
