'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserSession } from '@/components/navigation/navigation-types';

const CACHE_KEY = 'nav_session';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedSession {
  data: UserSession;
  timestamp: number;
}

/**
 * Gets cached session from sessionStorage
 */
function getCachedSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp }: CachedSession = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error reading cached session:', error);
    return null;
  }
}

/**
 * Caches session in sessionStorage
 */
function setCachedSession(session: UserSession): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      data: session,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Error caching session:', error);
  }
}

/**
 * Custom hook for navigation logic
 * Handles session fetching, caching, and active state management
 */
export function useNavigation() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  
  useEffect(() => {
    fetchSession();
    
    // Listen for logout events to refetch session
    const handleLogout = () => {
      sessionStorage.removeItem(CACHE_KEY);
      fetchSession();
    };
    
    window.addEventListener('userLoggedOut', handleLogout);
    return () => window.removeEventListener('userLoggedOut', handleLogout);
  }, []);
  
  const fetchSession = async () => {
    // Check cache first
    const cachedSession = getCachedSession();
    if (cachedSession) {
      setSession(cachedSession);
      setLoading(false);
      return;
    }
    
    // Fetch from API
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setSession(data);
        setCachedSession(data);
      } else {
        // Treat as guest user
        const guestSession: UserSession = {
          user: {
            id: '',
            email: '',
            role: 'GUEST',
            firstName: '',
            lastName: '',
          },
        };
        setSession(guestSession);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
      // Fall back to guest navigation
      const guestSession: UserSession = {
        user: {
          id: '',
          email: '',
          role: 'GUEST',
          firstName: '',
          lastName: '',
        },
      };
      setSession(guestSession);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Checks if a given href is active based on the current pathname
   */
  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };
  
  return { session, loading, isActive };
}
