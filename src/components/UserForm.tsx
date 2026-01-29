'use client';

import { useState } from 'react';
import { UserSchema } from '@/schemas/user.schema';
import { ZodError } from 'zod';

interface ApiError {
  path: string;
  message: string;
}

/**
 * Example form component demonstrating Zod validation
 */
export function UserForm() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    age: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    try {
      // Validate form data with Zod
      const validatedData = UserSchema.parse({
        ...formData,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
      });

      // Submit to API
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({ email: '', name: '', age: '', isActive: true });
        // Trigger a custom event to notify parent components
        window.dispatchEvent(new CustomEvent('userCreated'));
      } else if (result.errors) {
        // Handle validation errors from API
        const fieldErrors: Record<string, string> = {};
        result.errors.forEach((err: ApiError) => {
          fieldErrors[err.path] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: result.message || 'Failed to create user' });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          const field = err.path.join('.');
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: 'An unexpected error occurred' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="age" className="block text-sm font-medium">
          Age
        </label>
        <input
          id="age"
          type="number"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
      </div>

      <div className="flex items-center">
        <input
          id="isActive"
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm">
          Active
        </label>
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Submit
      </button>

      {errors.general && (
        <p className="text-red-500 text-sm">{errors.general}</p>
      )}

      {success && (
        <p className="text-green-500 text-sm">User created successfully!</p>
      )}
    </form>
  );
}
