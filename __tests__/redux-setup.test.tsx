import { render, screen, act } from '@testing-library/react';
import { makeStore, RootState, AppDispatch } from '@/lib/redux/store';
import { ReduxProvider } from '@/lib/redux/provider';
import { addItem } from '@/lib/redux/slices/exampleSlice';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';

// Test component to verify Redux integration
function TestComponent() {
  const items = useAppSelector((state) => state.example.items);
  const dispatch = useAppDispatch();

  return (
    <div>
      <div data-testid="items-count">{items.length}</div>
      <button onClick={() => dispatch(addItem('test'))}>Add Item</button>
    </div>
  );
}

describe('Redux Setup Unit Tests', () => {
  describe('Store Configuration', () => {
    it('should create a store with the correct initial state', () => {
      const store = makeStore();
      const state = store.getState();

      // Verify store has the example slice
      expect(state.example).toBeDefined();
      
      // Verify initial state structure
      expect(state.example.items).toEqual([]);
      expect(state.example.loading).toBe(false);
      expect(state.example.error).toBe(null);
      expect(state.example.counter).toBe(0);
    });

    it('should allow dispatching actions', () => {
      const store = makeStore();
      
      // Dispatch an action
      store.dispatch(addItem('test item'));
      
      // Verify state was updated
      const state = store.getState();
      expect(state.example.items).toContain('test item');
      expect(state.example.items.length).toBe(1);
    });

    it('should support multiple independent store instances', () => {
      const store1 = makeStore();
      const store2 = makeStore();

      // Dispatch to store1
      store1.dispatch(addItem('store1 item'));
      
      // Verify store2 is not affected
      expect(store1.getState().example.items.length).toBe(1);
      expect(store2.getState().example.items.length).toBe(0);
    });
  });

  describe('TypeScript Types', () => {
    it('should export RootState type correctly', () => {
      const store = makeStore();
      const state: RootState = store.getState();
      
      // Type check - if this compiles, the type is correct
      expect(state.example).toBeDefined();
      expect(state.example.items).toBeDefined();
      expect(state.example.loading).toBeDefined();
      expect(state.example.error).toBeDefined();
      expect(state.example.counter).toBeDefined();
    });

    it('should export AppDispatch type correctly', () => {
      const store = makeStore();
      const dispatch: AppDispatch = store.dispatch;
      
      // Type check - if this compiles, the type is correct
      const action = addItem('test');
      dispatch(action);
      
      expect(store.getState().example.items).toContain('test');
    });
  });

  describe('Redux Provider', () => {
    it('should wrap application and provide store to components', () => {
      render(
        <ReduxProvider>
          <TestComponent />
        </ReduxProvider>
      );

      // Verify component can access Redux state
      const itemsCount = screen.getByTestId('items-count');
      expect(itemsCount.textContent).toBe('0');
    });

    it('should allow components to dispatch actions', () => {
      render(
        <ReduxProvider>
          <TestComponent />
        </ReduxProvider>
      );

      const button = screen.getByText('Add Item');
      const itemsCount = screen.getByTestId('items-count');

      // Initial state
      expect(itemsCount.textContent).toBe('0');

      // Dispatch action
      act(() => {
        button.click();
      });

      // Verify state updated
      expect(itemsCount.textContent).toBe('1');
    });

    it('should maintain separate store instances for different provider trees', () => {
      const { container: container1 } = render(
        <ReduxProvider>
          <TestComponent />
        </ReduxProvider>
      );

      const { container: container2 } = render(
        <ReduxProvider>
          <TestComponent />
        </ReduxProvider>
      );

      // Get buttons from both trees
      const button1 = container1.querySelector('button')!;
      const button2 = container2.querySelector('button')!;

      // Click button in first tree
      act(() => {
        button1.click();
      });

      // Verify only first tree's state changed
      const count1 = container1.querySelector('[data-testid="items-count"]')!;
      const count2 = container2.querySelector('[data-testid="items-count"]')!;

      expect(count1.textContent).toBe('1');
      expect(count2.textContent).toBe('0');
    });
  });

  describe('Layout Integration', () => {
    it('should verify provider is used in layout structure', async () => {
      // Read the layout file to verify ReduxProvider is imported and used
      const fs = require('fs');
      const path = require('path');
      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

      // Verify ReduxProvider is imported
      expect(layoutContent).toContain('ReduxProvider');
      expect(layoutContent).toContain('@/lib/redux/provider');

      // Verify ReduxProvider wraps children
      expect(layoutContent).toContain('<ReduxProvider>');
      expect(layoutContent).toContain('{children}');
      expect(layoutContent).toContain('</ReduxProvider>');
    });
  });
});
