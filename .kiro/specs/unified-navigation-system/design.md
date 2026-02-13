# Unified Navigation System - Design Document

## Architecture Overview

The Unified Navigation System follows a component-based architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Root Layout (app/layout.tsx)            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            UnifiedNavigation Component                 │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  useNavigation Hook (session, cart, config)     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐  │  │
│  │  │  DesktopNav     │  │     MobileNav            │  │  │
│  │  │  - NavLogo      │  │     - Hamburger          │  │  │
│  │  │  - NavItems     │  │     - Drawer             │  │  │
│  │  │  - NavActions   │  │     - AccordionMenu      │  │  │
│  │  └─────────────────┘  └──────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ navigationConfig.ts (config)
                              ├─ navigation-types.ts (types)
                              └─ navigation-utils.ts (helpers)
```

## Component Structure

### Directory Layout
```
src/
├── components/
│   ├── ui/
│   │   └── navigation-menu.tsx         # shadcn/ui NavigationMenu component
│   └── navigation/
│       ├── UnifiedNavigation.tsx       # Main navigation component
│       ├── DesktopNav.tsx              # Desktop horizontal nav (uses NavigationMenu)
│       ├── MobileNav.tsx               # Mobile hamburger nav (uses Sheet)
│       ├── NavLogo.tsx                 # Logo component
│       ├── NavActions.tsx              # Right-side actions (cart, profile, logout)
│       ├── navigationConfig.ts         # Navigation configuration
│       ├── navigation-types.ts         # TypeScript types
│       └── navigation-utils.ts         # Helper functions
├── hooks/
│   └── useNavigation.ts                # Custom hook for navigation logic
└── app/
    └── layout.tsx                      # Root layout (updated)
```

### shadcn/ui Components Used
- **NavigationMenu**: Main navigation component with built-in submenu support
- **NavigationMenuList**: Container for navigation items
- **NavigationMenuItem**: Individual navigation item
- **NavigationMenuTrigger**: Trigger for dropdown submenus
- **NavigationMenuContent**: Dropdown content container
- **NavigationMenuLink**: Navigation link component
- **Sheet**: Mobile drawer/sidebar component

## Data Structures

### Navigation Item Type
```typescript
// src/components/navigation/navigation-types.ts

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
```

### Navigation Configuration
```typescript
// src/components/navigation/navigationConfig.ts

import {
  ShoppingBag, Package, Users, Store, MapPin, Tag,
  BarChart3, Shield, Settings, Clock, Utensils,
  Truck, History, User, ShoppingCart, CreditCard,
  FileText, Bell, Calendar, Home
} from 'lucide-react';
import { NavigationConfig, NavigationTheme } from './navigation-types';

export const navigationConfig: NavigationConfig = {
  CUSTOMER: [
    {
      href: '/',
      label: 'Home',
      icon: Home,
    },
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      href: '/orders',
      label: 'Orders',
      icon: Package,
    },
    {
      href: '/cart',
      label: 'Cart',
      icon: ShoppingCart,
      badge: true,
    },
    {
      label: 'My Account',
      icon: User,
      children: [
        {
          href: '/profile',
          label: 'Profile',
          icon: User,
        },
        {
          href: '/profile/addresses',
          label: 'Addresses',
          icon: MapPin,
        },
        {
          href: '/orders',
          label: 'Order History',
          icon: History,
        },
        {
          href: '/notifications',
          label: 'Notifications',
          icon: Bell,
        },
      ],
    },
  ],

  SUPER_ADMIN: [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      label: 'Management',
      icon: Settings,
      children: [
        {
          href: '/admin/users',
          label: 'Users',
          icon: Users,
          description: 'Manage all platform users',
        },
        {
          href: '/admin/vendors',
          label: 'Vendors',
          icon: Store,
          description: 'Manage vendor accounts',
        },
        {
          href: '/admin/delivery-partners',
          label: 'Delivery Partners',
          icon: Truck,
          description: 'Manage delivery partners',
        },
        {
          href: '/admin/products',
          label: 'Products',
          icon: Package,
          description: 'Manage all products',
        },
      ],
    },
    {
      label: 'Orders',
      icon: ShoppingCart,
      children: [
        {
          href: '/admin/orders',
          label: 'All Orders',
          icon: ShoppingCart,
        },
        {
          href: '/admin/orders?status=PENDING',
          label: 'Pending Orders',
          icon: Clock,
        },
        {
          href: '/admin/orders?status=DELIVERED',
          label: 'Completed Orders',
          icon: Package,
        },
      ],
    },
    {
      label: 'Configuration',
      icon: Settings,
      children: [
        {
          href: '/admin/service-areas',
          label: 'Service Areas',
          icon: MapPin,
        },
        {
          href: '/admin/categories',
          label: 'Categories',
          icon: Tag,
        },
        {
          href: '/admin/default-meal-slots',
          label: 'Default Meal Slots',
          icon: Calendar,
        },
      ],
    },
  ],

  VENDOR: [
    {
      href: '/vendor/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      label: 'My Business',
      icon: Store,
      children: [
        {
          href: '/vendor/products',
          label: 'Products',
          icon: Package,
        },
        {
          href: '/vendor/orders',
          label: 'Orders',
          icon: ShoppingCart,
        },
        {
          href: '/vendor/operating-hours',
          label: 'Operating Hours',
          icon: Clock,
        },
      ],
    },
    {
      label: 'Fulfillment',
      icon: Truck,
      children: [
        {
          href: '/vendor/meal-slots',
          label: 'Meal Slots',
          icon: Utensils,
          description: 'Manage meal time slots',
        },
        {
          href: '/vendor/settings/fulfillment',
          label: 'Fulfillment Settings',
          icon: Settings,
          description: 'Configure delivery, pickup, eat-in',
        },
      ],
    },
    {
      href: '/vendor/profile',
      label: 'Profile',
      icon: User,
      divider: true,
    },
  ],

  DELIVERY_PARTNER: [
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      label: 'Deliveries',
      icon: Truck,
      children: [
        {
          href: '/delivery/available',
          label: 'Available',
          icon: MapPin,
          description: 'View available deliveries',
        },
        {
          href: '/delivery/active',
          label: 'Active',
          icon: Package,
          description: 'Your active deliveries',
        },
        {
          href: '/delivery/history',
          label: 'History',
          icon: History,
          description: 'Past deliveries',
        },
      ],
    },
    {
      label: 'Earnings',
      icon: CreditCard,
      children: [
        {
          href: '/delivery/earnings',
          label: 'Overview',
          icon: BarChart3,
        },
        {
          href: '/delivery/earnings/history',
          label: 'Payment History',
          icon: History,
        },
      ],
    },
    {
      href: '/delivery/profile',
      label: 'Profile',
      icon: User,
    },
  ],

  GUEST: [
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      href: '/auth/login',
      label: 'Login',
      icon: User,
    },
  ],
};

export const navigationThemes: Record<string, NavigationTheme> = {
  CUSTOMER: {
    logoColor: 'bg-blue-600',
    logoIcon: ShoppingBag,
    logoText: 'Marketplace',
    accentColor: 'blue',
  },
  SUPER_ADMIN: {
    logoColor: 'bg-purple-600',
    logoIcon: Shield,
    logoText: 'Admin Portal',
    accentColor: 'purple',
  },
  VENDOR: {
    logoColor: 'bg-orange-600',
    logoIcon: Store,
    logoText: 'Vendor Dashboard',
    accentColor: 'orange',
  },
  DELIVERY_PARTNER: {
    logoColor: 'bg-green-600',
    logoIcon: Truck,
    logoText: 'Delivery Partner',
    accentColor: 'green',
  },
  GUEST: {
    logoColor: 'bg-blue-600',
    logoIcon: ShoppingBag,
    logoText: 'Marketplace',
    accentColor: 'blue',
  },
};
```

## Component Designs

### 1. UnifiedNavigation Component
**Purpose:** Main navigation wrapper that orchestrates desktop/mobile views

**Props:** None (uses hooks internally)

**State:**
- `session`: User session data
- `cartCount`: Number of items in cart
- `isMobileMenuOpen`: Mobile menu state

**Behavior:**
- Fetches user session on mount
- Determines user role
- Renders appropriate navigation config
- Handles responsive breakpoints
- Manages mobile menu state

**Pseudo-code:**
```typescript
function UnifiedNavigation() {
  const { session, loading } = useNavigation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  
  const role = session?.user?.role || 'GUEST';
  const navItems = navigationConfig[role];
  const theme = navigationThemes[role];
  
  // Fetch cart count for badge
  useEffect(() => {
    if (role === 'CUSTOMER') {
      fetchCartCount().then(setCartCount);
    }
  }, [role]);
  
  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => fetchCartCount().then(setCartCount);
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);
  
  if (loading) {
    return <NavigationSkeleton />;
  }
  
  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
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
            onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </div>
      </div>
    </header>
  );
}
```

### 2. DesktopNav Component
**Purpose:** Horizontal navigation for desktop screens using shadcn/ui NavigationMenu

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ [Logo] [Nav Item 1] [Nav Item 2▼] [Nav Item 3]  [Actions] │
│                                                   [Cart][👤]│
└────────────────────────────────────────────────────────────┘
                         │
                         ▼ (on hover/click)
              ┌──────────────────────┐
              │ Submenu Item 1       │
              │ Submenu Item 2       │
              │ Submenu Item 3       │
              └──────────────────────┘
```

**Implementation with shadcn/ui:**
```typescript
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

function DesktopNav({ items, theme, session, cartCount }) {
  return (
    <div className="flex items-center justify-between h-16">
      <div className="flex items-center space-x-6">
        <NavLogo theme={theme} />
        
        <NavigationMenu>
          <NavigationMenuList>
            {items.map((item) => (
              <NavigationMenuItem key={item.label}>
                {item.children ? (
                  <>
                    <NavigationMenuTrigger>
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={child.href}
                                className="block select-none space-y-1 rounded-md p-3 hover:bg-accent"
                              >
                                <div className="flex items-center">
                                  <child.icon className="w-4 h-4 mr-2" />
                                  <div className="text-sm font-medium">
                                    {child.label}
                                  </div>
                                </div>
                                {child.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {child.description}
                                  </p>
                                )}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <Link href={item.href} legacyBehavior passHref>
                    <NavigationMenuLink>
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                      {item.badge && cartCount > 0 && (
                        <span className="ml-2 badge">{cartCount}</span>
                      )}
                    </NavigationMenuLink>
                  </Link>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      
      <NavActions session={session} cartCount={cartCount} />
    </div>
  );
}
```

**Features:**
- Built-in hover/click behavior
- Smooth animations and transitions
- Keyboard navigation support
- ARIA attributes included
- Active state highlighting
- Responsive positioning

### 3. MobileNav Component
**Purpose:** Hamburger menu for mobile screens using shadcn/ui Sheet

**Layout:**
```
┌────────────────────────────────────┐
│ [☰] [Logo]              [Cart][👤] │
└────────────────────────────────────┘

(When open - side drawer)
┌────────────────────────────────────┐
│ [×] Close                          │
│                                    │
│ ▶ Nav Item 1                       │
│ ▼ Nav Item 2                       │
│   → Submenu Item 1                 │
│   → Submenu Item 2                 │
│ ▶ Nav Item 3                       │
│                                    │
│ [Logout Button]                    │
└────────────────────────────────────┘
```

**Implementation with shadcn/ui:**
```typescript
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Menu } from "lucide-react";

function MobileNav({ items, theme, session, cartCount, isOpen, onToggle }) {
  return (
    <div className="flex items-center justify-between h-16">
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-[300px]">
          <SheetHeader>
            <SheetTitle>
              <NavLogo theme={theme} />
            </SheetTitle>
          </SheetHeader>
          
          <nav className="mt-6">
            <Accordion type="single" collapsible>
              {items.map((item, index) => (
                item.children ? (
                  <AccordionItem key={item.label} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center">
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.label}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-8 space-y-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => onToggle(false)}
                            className="flex items-center py-2 text-sm hover:text-primary"
                          >
                            <child.icon className="w-4 h-4 mr-2" />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onToggle(false)}
                    className="flex items-center py-3 text-base hover:text-primary"
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                    {item.badge && cartCount > 0 && (
                      <span className="ml-auto badge">{cartCount}</span>
                    )}
                  </Link>
                )
              ))}
            </Accordion>
          </nav>
          
          <div className="mt-6 pt-6 border-t">
            <LogoutButton />
          </div>
        </SheetContent>
      </Sheet>
      
      <NavLogo theme={theme} />
      <NavActions session={session} cartCount={cartCount} compact />
    </div>
  );
}
```

**Features:**
- Built-in slide-in animation
- Overlay backdrop
- Accordion-style submenus
- Touch-friendly tap targets (min 44px)
- Focus trap when open
- Escape key to close

### 4. Required shadcn/ui Components

Install the following shadcn/ui components:

```bash
npx shadcn@latest add navigation-menu
npx shadcn@latest add sheet
npx shadcn@latest add accordion
npx shadcn@latest add button
```

These components provide:
- **NavigationMenu**: Desktop navigation with built-in submenu support
- **Sheet**: Mobile drawer with overlay and animations
- **Accordion**: Collapsible sections for mobile submenus
- **Button**: Consistent button styling

All components come with:
- Built-in accessibility (ARIA attributes, keyboard navigation)
- Smooth animations and transitions
- Focus management
- Responsive behavior
- Theme support

## State Management

### useNavigation Hook
```typescript
// src/hooks/useNavigation.ts

export function useNavigation() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  
  useEffect(() => {
    fetchSession();
  }, []);
  
  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      } else {
        setSession({ user: { role: 'GUEST' } } as UserSession);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
      setSession({ user: { role: 'GUEST' } } as UserSession);
    } finally {
      setLoading(false);
    }
  };
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };
  
  return { session, loading, isActive };
}
```

## Active State Logic

### Route Matching Algorithm
```typescript
// src/components/navigation/navigation-utils.ts

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  // Exact match for home
  if (item.href === '/' && pathname === '/') {
    return true;
  }
  
  // Prefix match for other routes
  if (item.href && pathname.startsWith(item.href)) {
    return true;
  }
  
  // Check if any child is active
  if (item.children) {
    return item.children.some(child => isNavItemActive(child, pathname));
  }
  
  return false;
}

export function getActiveNavItem(items: NavItem[], pathname: string): NavItem | null {
  for (const item of items) {
    if (isNavItemActive(item, pathname)) {
      return item;
    }
    if (item.children) {
      const activeChild = getActiveNavItem(item.children, pathname);
      if (activeChild) return item; // Return parent if child is active
    }
  }
  return null;
}
```

## Styling Approach

### shadcn/ui Styling
The navigation uses shadcn/ui components which come with pre-built styles that follow Tailwind CSS conventions. Customization is done through:

1. **CSS Variables** (in `globals.css`):
```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  /* ... other variables */
}
```

2. **Component Customization**:
```typescript
// Custom NavigationMenuLink styling
const navigationMenuLinkStyle = cn(
  "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors",
  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
);

// Role-specific accent colors
const roleAccentColors = {
  CUSTOMER: 'hsl(217, 91%, 60%)',      // blue
  SUPER_ADMIN: 'hsl(271, 91%, 65%)',   // purple
  VENDOR: 'hsl(25, 95%, 53%)',         // orange
  DELIVERY_PARTNER: 'hsl(142, 71%, 45%)', // green
  GUEST: 'hsl(217, 91%, 60%)',         // blue
};
```

3. **Tailwind Utility Classes**:
```typescript
// Base navigation styles
const navStyles = {
  header: 'bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm',
  container: 'container mx-auto px-4',
  
  // Desktop
  desktopNav: 'flex items-center justify-between h-16',
  
  // Mobile
  mobileNav: 'flex items-center justify-between h-16',
  
  // Badge
  badge: 'ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full',
};
```

### Animations
shadcn/ui components include built-in animations:
- **NavigationMenu**: Smooth dropdown fade-in/out
- **Sheet**: Slide-in from left/right with backdrop fade
- **Accordion**: Smooth expand/collapse

No custom animations needed - all handled by the components!

## Integration Points

### 1. Root Layout Update
```typescript
// src/app/layout.tsx

import UnifiedNavigation from '@/components/navigation/UnifiedNavigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          <UnifiedNavigation />
          <main>{children}</main>
        </ReduxProvider>
      </body>
    </html>
  );
}
```

### 2. Remove Navigation from Role Layouts
```typescript
// src/app/(customer)/layout.tsx
// Remove navigation, keep only customer-specific wrappers if needed

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation removed - now in root layout */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      <Footer /> {/* Keep footer if needed */}
    </div>
  );
}
```

### 3. Remove Embedded Navigation from Pages
```typescript
// src/app/vendors/page.tsx
// Remove renderNavigation() function and embedded nav
// Page now inherits navigation from root layout

export default function VendorsPage() {
  // ... page content only
  return (
    <div className="space-y-6">
      <h1>Browse Vendors</h1>
      {/* ... */}
    </div>
  );
}
```

## Performance Optimizations

### 1. Session Caching
```typescript
// Cache session in sessionStorage to avoid repeated fetches
const CACHE_KEY = 'nav_session';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedSession(): UserSession | null {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_DURATION) {
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
  
  return data;
}

function setCachedSession(session: UserSession) {
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({
    data: session,
    timestamp: Date.now(),
  }));
}
```

### 2. Component Optimization
```typescript
// shadcn/ui components are already optimized
// No need for lazy loading as they're lightweight
// Sheet component only renders when open (built-in optimization)
```

### 3. Memoization
```typescript
// Memoize navigation items with active states
const navItemsWithActiveState = useMemo(() => {
  return navItems.map(item => ({
    ...item,
    isActive: isNavItemActive(item, pathname),
  }));
}, [navItems, pathname]);
```

## Accessibility Features

### Built-in Accessibility (shadcn/ui)
shadcn/ui components come with comprehensive accessibility features:

**NavigationMenu:**
- Full keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ARIA attributes (aria-expanded, aria-controls, role="navigation")
- Focus management
- Screen reader announcements

**Sheet (Mobile Menu):**
- Focus trap when open
- Escape key to close
- Return focus to trigger on close
- ARIA dialog attributes
- Backdrop click to close

**Accordion:**
- Keyboard navigation (Tab, Enter, Space)
- ARIA attributes (aria-expanded, aria-controls)
- Single/multiple expansion modes

### Additional Accessibility
```typescript
// Add skip to main content link
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground"
>
  Skip to main content
</a>

// Main content landmark
<main id="main-content" role="main">
  {children}
</main>
```

## Error Handling

### Session Fetch Failure
```typescript
try {
  const response = await fetch('/api/auth/session');
  if (!response.ok) {
    // Treat as guest user
    setSession({ user: { role: 'GUEST' } });
  }
} catch (error) {
  console.error('Session fetch failed:', error);
  // Show error toast (optional)
  // Fall back to guest navigation
  setSession({ user: { role: 'GUEST' } });
}
```

### Cart Count Fetch Failure
```typescript
try {
  const count = await fetchCartCount();
  setCartCount(count);
} catch (error) {
  console.error('Cart count fetch failed:', error);
  // Don't show badge if fetch fails
  setCartCount(0);
}
```

## Testing Strategy

### Unit Tests
- Navigation config structure validation
- Active state logic
- Route matching algorithm
- Helper functions

### Component Tests
- NavItem rendering with/without children
- Submenu open/close behavior
- Active state highlighting
- Badge display
- Mobile menu toggle

### Integration Tests
- Full navigation flow
- Role-based rendering
- Session handling
- Cart badge updates

### E2E Tests
- Navigation across different pages
- Submenu interactions
- Mobile menu functionality
- Keyboard navigation

## Migration Strategy

### Phase 1: Setup (Day 1)
1. Install shadcn/ui components (navigation-menu, sheet, accordion)
2. Create navigation component structure
3. Implement navigation config
4. Build core components (UnifiedNavigation, DesktopNav, MobileNav)
5. Add to root layout

### Phase 2: Integration (Day 2-3)
1. Update root layout
2. Remove navigation from role layouts
3. Remove embedded navigation from pages
4. Test on all pages

### Phase 3: Refinement (Day 4-5)
1. Add animations and transitions
2. Implement accessibility features
3. Performance optimizations
4. Cross-browser testing

### Phase 4: Cleanup (Day 6)
1. Remove old navigation code
2. Update documentation
3. Final testing
4. Deploy

## Rollback Plan

If issues arise:
1. Revert root layout changes
2. Restore role-specific layouts
3. Restore page-specific navigation
4. Fix issues in separate branch
5. Re-deploy when ready

## Success Metrics

- Navigation renders in < 100ms
- No layout shift (CLS = 0)
- All pages have navigation
- Mobile menu works on all devices
- Accessibility score > 95
- Zero console errors
- User feedback positive

## Future Enhancements

1. **Mega Menu**: For admin with many options
2. **Search**: Global search in navigation
3. **Notifications**: Dropdown for notifications
4. **Breadcrumbs**: Secondary navigation
5. **Favorites**: Quick access to favorite pages
6. **Customization**: User-configurable navigation
7. **Analytics**: Track navigation usage
8. **A/B Testing**: Test different layouts

## Conclusion

This design provides a robust, scalable, and maintainable navigation system that meets all requirements while being easy to extend and customize for future needs.
