'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { NavLogo } from './NavLogo';
import { NavActions } from './NavActions';
import { NavItem, NavigationTheme, UserSession } from './navigation-types';
import { isNavItemActive } from './navigation-utils';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  items: NavItem[];
  theme: NavigationTheme;
  session: UserSession | null;
  cartCount: number;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

/**
 * MobileNav component renders hamburger menu for mobile screens
 * Uses shadcn/ui Sheet for drawer and Accordion for submenus
 */
function MobileNavComponent({ 
  items, 
  theme, 
  session, 
  cartCount, 
  isOpen, 
  onToggle 
}: MobileNavProps) {
  const pathname = usePathname();
  
  const handleNavigation = () => {
    onToggle(false);
  };
  
  return (
    <div className="flex items-center justify-between h-16">
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-[300px] overflow-y-auto bg-white">
          <SheetHeader>
            <SheetTitle>
              <NavLogo theme={theme} />
            </SheetTitle>
          </SheetHeader>
          
          <nav className="mt-6">
            <Accordion type="single" collapsible className="w-full">
              {items.map((item, index) => {
                const active = isNavItemActive(item, pathname);
                
                return item.children ? (
                  <AccordionItem 
                    key={item.label} 
                    value={`item-${index}`}
                    className="border-b"
                  >
                    <AccordionTrigger 
                      className={cn(
                        'text-left py-3 hover:no-underline',
                        active && 'text-primary font-semibold bg-primary/10 border-l-4 border-primary pl-2'
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="w-5 h-5 mr-3" />
                        <span>{item.label}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-8 space-y-2 pb-2">
                        {item.children.map((child) => {
                          const childActive = isNavItemActive(child, pathname);
                          
                          return (
                            <Link
                              key={child.href}
                              href={child.href || '#'}
                              onClick={handleNavigation}
                              aria-current={childActive ? 'page' : undefined}
                              className={cn(
                                'flex items-center py-2 text-sm transition-all duration-200 rounded-md px-2',
                                'hover:text-primary hover:bg-primary/5 hover:translate-x-1',
                                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                                childActive && 'text-primary font-semibold bg-primary/10'
                              )}
                            >
                              <child.icon className="w-4 h-4 mr-2" />
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href || '#'}
                    onClick={handleNavigation}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center py-3 text-base border-b transition-all duration-200',
                      'hover:text-primary hover:bg-primary/5 hover:translate-x-1',
                      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                      active && 'text-primary font-semibold bg-primary/10 border-l-4 border-primary pl-2'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                    {item.badge && cartCount > 0 && (
                      <span className="ml-auto px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full font-bold shadow-sm min-w-[1.5rem] text-center">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </Accordion>
          </nav>
          
          {session && session.user.role !== 'GUEST' && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex flex-col space-y-2">
                <Link
                  href="/profile"
                  onClick={handleNavigation}
                  className="flex items-center py-2 text-sm hover:text-primary transition-all duration-200 hover:translate-x-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none rounded-md px-2"
                >
                  Profile
                </Link>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST' });
                      if (typeof window !== 'undefined') {
                        sessionStorage.clear();
                        window.location.href = '/auth/login';
                      }
                    } catch (error) {
                      console.error('Logout failed:', error);
                    }
                  }}
                  className="flex items-center py-2 text-sm text-left hover:text-primary transition-all duration-200 hover:translate-x-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none rounded-md px-2"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      <NavLogo theme={theme} />
      <NavActions session={session} cartCount={cartCount} compact />
    </div>
  );
}

// Memoized export to prevent unnecessary re-renders
export const MobileNav = memo(MobileNavComponent);
