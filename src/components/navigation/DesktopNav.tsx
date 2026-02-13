'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { NavLogo } from './NavLogo';
import { NavActions } from './NavActions';
import { NavItem, NavigationTheme, UserSession } from './navigation-types';
import { isNavItemActive } from './navigation-utils';
import { cn } from '@/lib/utils';

interface DesktopNavProps {
  items: NavItem[];
  theme: NavigationTheme;
  session: UserSession | null;
  cartCount: number;
}

/**
 * DesktopNav component renders horizontal navigation for desktop screens
 * Uses shadcn/ui NavigationMenu for dropdown submenus
 */
function DesktopNavComponent({ items, theme, session, cartCount }: DesktopNavProps) {
  const pathname = usePathname();
  
  return (
    <div className="flex items-center justify-between h-16">
      <div className="flex items-center space-x-6">
        <NavLogo theme={theme} />
        
        <NavigationMenu>
          <NavigationMenuList>
            {items.map((item) => {
              const active = isNavItemActive(item, pathname);
              
              return (
                <NavigationMenu key={item.label}>
                <NavigationMenuItem>
                  {item.children ? (
                    <>
                      <NavigationMenuTrigger
                        className={cn(
                          'flex items-center space-x-2',
                          active && 'text-primary font-semibold bg-primary/10 border-b-2 border-primary'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[400px] gap-3 p-4 bg-white">
                          {item.children.map((child) => {
                            const childActive = isNavItemActive(child, pathname);
                            
                            return (
                              <li key={child.href}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    href={child.href || '#'}
                                    aria-current={childActive ? 'page' : undefined}
                                    className={cn(
                                      'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-200',
                                      'hover:bg-primary/10 hover:text-primary hover:translate-x-1 focus:bg-primary/10 focus:text-primary',
                                      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                      childActive && 'bg-primary/15 text-primary font-semibold border-l-4 border-primary'
                                    )}
                                  >
                                    <div className="flex items-center">
                                      <child.icon className={cn("w-4 h-4 mr-2", childActive && "text-primary")} />
                                      <div className="text-sm font-medium leading-none">
                                        {child.label}
                                      </div>
                                    </div>
                                    {child.description && (
                                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                        {child.description}
                                      </p>
                                    )}
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            );
                          })}
                        </ul>
                      </NavigationMenuContent>
                    </>
                  ) : (
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href || '#'}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-all duration-200',
                          'hover:bg-accent hover:text-accent-foreground hover:scale-105 focus:bg-accent focus:text-accent-foreground focus:outline-none',
                          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          'disabled:pointer-events-none disabled:opacity-50',
                          active && 'text-primary font-semibold bg-primary/10 border-b-2 border-primary'
                        )}
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.label}
                        {item.badge && cartCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full font-bold shadow-sm min-w-[1.5rem] text-center transition-transform hover:scale-110">
                            {cartCount > 99 ? '99+' : cartCount}
                          </span>
                        )}
                      </Link>
                    </NavigationMenuLink>
                  )}
                </NavigationMenuItem>
                </NavigationMenu>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      
      <NavActions session={session} cartCount={cartCount} />
    </div>
  );
}

// Memoized export to prevent unnecessary re-renders
export const DesktopNav = memo(DesktopNavComponent);
