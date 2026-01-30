'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CartItem {
  quantity: number;
}

export default function CartBadge() {
  const [itemCount, setItemCount] = useState(0);

  const fetchCartCount = useCallback(async () => {
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const result = await response.json();
        const cart = result.data;
        if (cart && cart.items) {
          const count = cart.items.reduce((total: number, item: CartItem) => total + item.quantity, 0);
          setItemCount(count);
        } else {
          setItemCount(0);
        }
      } else {
        setItemCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch cart count:', error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount
    void fetchCartCount();
    
    // Listen for cart update events
    window.addEventListener('cartUpdated', fetchCartCount);
    
    return () => {
      window.removeEventListener('cartUpdated', fetchCartCount);
    };
  }, [fetchCartCount]);

  return (
    <Link href="/cart">
      <Button variant="ghost" size="icon" className="relative">
        <ShoppingCart className="w-5 h-5" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
