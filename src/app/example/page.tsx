'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { incrementCounter, decrementCounter, addItem, clearItems } from '@/lib/redux/slices/exampleSlice';
import { Button } from '@/components/ui/button';
import { UserForm } from '@/components/UserForm';

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

/**
 * Example page demonstrating the full stack:
 * - Redux Toolkit for state management
 * - shadcn/ui components with Tailwind CSS styling
 * - Zod validation in UserForm
 * - API routes with Prisma (in UserForm submission)
 */
export default function ExamplePage() {
  const dispatch = useAppDispatch();
  const { counter, items } = useAppSelector((state) => state.example);
  const [itemInput, setItemInput] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
    
    // Listen for user creation events
    const handleUserCreated = () => {
      fetchUsers();
    };
    
    window.addEventListener('userCreated', handleUserCreated);
    
    return () => {
      window.removeEventListener('userCreated', handleUserCreated);
    };
  }, []);

  const handleAddItem = () => {
    if (itemInput.trim()) {
      dispatch(addItem(itemInput));
      setItemInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Full Stack Example
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Demonstrating Next.js + TypeScript + Redux + Tailwind + shadcn/ui + Zod + Prisma
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Redux State Management Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Redux State Management
            </h2>
            
            {/* Counter Demo */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
                Counter: <span className="text-blue-600 dark:text-blue-400 text-2xl">{counter}</span>
              </h3>
              <div className="flex gap-2">
                <Button onClick={() => dispatch(incrementCounter())} variant="default">
                  Increment
                </Button>
                <Button onClick={() => dispatch(decrementCounter())} variant="secondary">
                  Decrement
                </Button>
              </div>
            </div>

            {/* Items List Demo */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
                Items List
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={itemInput}
                  onChange={(e) => setItemInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                  placeholder="Add an item..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <Button onClick={handleAddItem}>Add</Button>
              </div>
              
              {items.length > 0 && (
                <>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {items.map((item, index) => (
                      <li
                        key={index}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => dispatch(clearItems())} variant="outline" size="sm">
                    Clear All
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Zod Validation Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Zod Validation + API
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Form with Zod schema validation and API integration
            </p>
            <UserForm />
          </div>
        </div>

        {/* Database Demo - Users List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Database (Prisma + PostgreSQL)
            </h2>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
          
          {users.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No users in database yet. Create one using the form above!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technology Stack Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
            Technology Stack
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Next.js 14+', desc: 'App Router' },
              { name: 'TypeScript', desc: 'Type Safety' },
              { name: 'Redux Toolkit', desc: 'State Management' },
              { name: 'Tailwind CSS', desc: 'Styling' },
              { name: 'shadcn/ui', desc: 'UI Components' },
              { name: 'Zod', desc: 'Validation' },
              { name: 'Prisma', desc: 'ORM' },
              { name: 'PostgreSQL', desc: 'Database' },
            ].map((tech) => (
              <div
                key={tech.name}
                className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg"
              >
                <p className="font-semibold text-gray-900 dark:text-white">{tech.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
