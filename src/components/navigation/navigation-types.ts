import { LucideIcon } from 'lucide-react';

export interface NavItem {
  // Navigation
  href?: string;                    // URL to navigate to (optional for parent items)
  label: string;                    // Display text
  icon: LucideIcon;                 // Lucide icon component
  
  // Submenu
  children?: NavItem[];             // Nested navigation items
  
  // Visual
  badge?: boolean;                  // Show dynamic badge (e.g., cart count)
  badgeCount?: number;              // Badge count value
  divider?: boolean;                // Show divider after this item
  description?: string;             // Tooltip or secondary text
  
  // Behavior
  requiresPermission?: string[];    // Additional permission checks
  onClick?: () => void;             // Custom click handler
  external?: boolean;               // Opens in new tab
  
  // State
  isActive?: boolean;               // Computed active state
}

export interface NavigationConfig {
  [role: string]: NavItem[];
}

export type UserRole = 'CUSTOMER' | 'SUPER_ADMIN' | 'VENDOR' | 'DELIVERY_PARTNER' | 'GUEST';

export interface UserSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  };
}

export interface NavigationTheme {
  logoColor: string;
  logoIcon: LucideIcon;
  logoText: string;
  accentColor: string;
}
