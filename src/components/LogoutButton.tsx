'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // Clear all session storage
        sessionStorage.clear();
        
        // Use window.location for a full page reload to ensure clean state
        window.location.href = '/auth/login';
      } else {
        console.error('Logout failed');
        alert('Logout failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
