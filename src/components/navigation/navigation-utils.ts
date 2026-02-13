import { NavItem } from './navigation-types';

/**
 * Determines if a navigation item is active based on the current pathname
 * @param item - The navigation item to check
 * @param pathname - The current pathname
 * @returns true if the item is active, false otherwise
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  // If item has no href (parent menu without direct link), check children
  if (!item.href) {
    if (item.children) {
      return item.children.some(child => isNavItemActive(child, pathname));
    }
    return false;
  }
  
  // Exact match only
  return pathname === item.href;
}

/**
 * Finds the active navigation item from a list of items
 * @param items - Array of navigation items
 * @param pathname - The current pathname
 * @returns The active navigation item or null if none found
 */
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
