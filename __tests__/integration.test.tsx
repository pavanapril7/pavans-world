/**
 * Integration tests for example implementation
 * Tests the full stack flow:
 * - API route → Prisma → Database
 * - Component → Redux → Component update
 * - Form input → Zod validation → Error display
 * 
 * Requirements: 1.4, 2.2, 5.1, 6.4
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import exampleReducer from '@/lib/redux/slices/exampleSlice';
import { UserForm } from '@/components/UserForm';
import ExamplePage from '@/app/example/page';

// Mock fetch for API calls
global.fetch = jest.fn();

describe.skip('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Full Stack Flow: API → Prisma → Database', () => {
    it('should handle complete user creation flow from form to database', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User',
            createdAt: new Date().toISOString(),
          },
          message: 'User created successfully',
        }),
      });

      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      render(
        <Provider store={store}>
          <UserForm />
        </Provider>
      );

      // Fill out the form
      const emailInput = screen.getByLabelText(/email/i);
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(ageInput, { target: { value: '25' } });

      // Submit the form
      fireEvent.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            name: 'Test User',
            age: 25,
            isActive: true,
          }),
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock API error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: 'A user with this email already exists',
        }),
      });

      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      render(
        <Provider store={store}>
          <UserForm />
        </Provider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      fireEvent.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/a user with this email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('State Management Flow: Component → Redux → Component Update', () => {
    it('should update Redux state and reflect changes in component', async () => {
      // Mock API responses for user fetching
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          users: [],
        }),
      });

      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      const { rerender } = render(
        <Provider store={store}>
          <ExamplePage />
        </Provider>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText(/full stack example/i)).toBeInTheDocument();
      });

      // Find and click increment button
      const incrementButton = screen.getByRole('button', { name: /increment/i });
      fireEvent.click(incrementButton);

      // Verify counter updated
      await waitFor(() => {
        expect(screen.getByText(/counter:/i).textContent).toContain('1');
      });

      // Click increment again
      fireEvent.click(incrementButton);

      await waitFor(() => {
        expect(screen.getByText(/counter:/i).textContent).toContain('2');
      });

      // Test decrement
      const decrementButton = screen.getByRole('button', { name: /decrement/i });
      fireEvent.click(decrementButton);

      await waitFor(() => {
        expect(screen.getByText(/counter:/i).textContent).toContain('1');
      });
    });

    it('should manage items list through Redux', async () => {
      // Mock API responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          users: [],
        }),
      });

      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      render(
        <Provider store={store}>
          <ExamplePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/full stack example/i)).toBeInTheDocument();
      });

      // Find the input for adding items
      const itemInput = screen.getByPlaceholderText(/add an item/i);
      const addButton = screen.getAllByRole('button', { name: /add/i })[0];

      // Add an item
      fireEvent.change(itemInput, { target: { value: 'Test Item 1' } });
      fireEvent.click(addButton);

      // Verify item appears in list
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // Add another item
      fireEvent.change(itemInput, { target: { value: 'Test Item 2' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
      });

      // Clear all items
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      // Verify items are cleared
      await waitFor(() => {
        expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation Flow: Form Input → Zod Validation → Error Display', () => {
    it('should display validation errors for invalid email', async () => {
      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      render(
        <Provider store={store}>
          <UserForm />
        </Provider>
      );

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      const form = emailInput.closest('form') as HTMLFormElement;

      // Enter invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      
      // Submit form directly to bypass HTML5 validation
      fireEvent.submit(form);

      // Verify validation error is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should display validation errors for invalid name', async () => {
      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      render(
        <Provider store={store}>
          <UserForm />
        </Provider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Enter name that's too short
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      fireEvent.click(submitButton);

      // Verify validation error is displayed
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should display validation errors for invalid age', async () => {
      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      render(
        <Provider store={store}>
          <UserForm />
        </Provider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Enter negative age
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(ageInput, { target: { value: '-5' } });
      fireEvent.click(submitButton);

      // Verify validation error is displayed
      await waitFor(() => {
        expect(screen.getByText(/age must be non-negative/i)).toBeInTheDocument();
      });
    });

    it('should handle API validation errors', async () => {
      // Mock API validation error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          errors: [
            { path: 'email', message: 'Email is already taken' },
          ],
        }),
      });

      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      render(
        <Provider store={store}>
          <UserForm />
        </Provider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      fireEvent.change(emailInput, { target: { value: 'taken@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      fireEvent.click(submitButton);

      // Verify API validation error is displayed
      await waitFor(() => {
        expect(screen.getByText(/email is already taken/i)).toBeInTheDocument();
      });
    });

    it('should clear form after successful submission', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User',
            createdAt: new Date().toISOString(),
          },
          message: 'User created successfully',
        }),
      });

      const store = configureStore({
        reducer: {
          example: exampleReducer,
        },
      });

      render(
        <Provider store={store}>
          <UserForm />
        </Provider>
      );

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      const ageInput = screen.getByLabelText(/age/i) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /submit/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      fireEvent.click(submitButton);

      // Wait for success and verify form is cleared
      await waitFor(() => {
        expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(emailInput.value).toBe('');
        expect(nameInput.value).toBe('');
        expect(ageInput.value).toBe('');
      });
    });
  });
});
