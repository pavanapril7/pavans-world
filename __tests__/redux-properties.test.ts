import * as fc from 'fast-check';
import { makeStore } from '@/lib/redux/store';
import {
  addItem,
  removeItem,
  setLoading,
  setError,
  incrementCounter,
  decrementCounter,
  setCounter,
  clearItems,
  reset,
} from '@/lib/redux/slices/exampleSlice';

// Feature: nextjs-app-setup, Property 1: Redux action dispatch updates state
// Validates: Requirements 2.2

describe('Redux Property Tests', () => {
  // Property 1: Redux action dispatch updates state
  // For any valid Redux action and initial state, dispatching the action 
  // should result in the state being updated according to the reducer logic
  it('should update state correctly when dispatching actions', () => {
    // Define arbitraries for different action types
    const addItemAction = fc.string().map(item => addItem(item));
    const removeItemAction = fc.nat().map(index => removeItem(index));
    const setLoadingAction = fc.boolean().map(loading => setLoading(loading));
    const setErrorAction = fc.option(fc.string(), { nil: null }).map(error => setError(error));
    const incrementCounterAction = fc.constant(incrementCounter());
    const decrementCounterAction = fc.constant(decrementCounter());
    const setCounterAction = fc.integer().map(value => setCounter(value));
    const clearItemsAction = fc.constant(clearItems());
    const resetAction = fc.constant(reset());

    // Combine all action types
    const actionArbitrary = fc.oneof(
      addItemAction,
      setLoadingAction,
      setErrorAction,
      incrementCounterAction,
      decrementCounterAction,
      setCounterAction,
      clearItemsAction,
      resetAction
    );

    fc.assert(
      fc.property(actionArbitrary, (action) => {
        const store = makeStore();
        const stateBefore = store.getState().example;
        
        // Dispatch the action
        store.dispatch(action);
        
        const stateAfter = store.getState().example;

        // Verify state was updated according to reducer logic
        switch (action.type) {
          case 'example/addItem':
            // Items array should have one more item
            expect(stateAfter.items.length).toBe(stateBefore.items.length + 1);
            // The new item should be at the end
            expect(stateAfter.items[stateAfter.items.length - 1]).toBe(action.payload);
            // Other state should remain unchanged
            expect(stateAfter.loading).toBe(stateBefore.loading);
            expect(stateAfter.error).toBe(stateBefore.error);
            expect(stateAfter.counter).toBe(stateBefore.counter);
            break;

          case 'example/removeItem':
            // We can't verify removal if the index is out of bounds
            // In that case, the array should remain unchanged
            if (action.payload < stateBefore.items.length) {
              expect(stateAfter.items.length).toBe(stateBefore.items.length - 1);
            } else {
              expect(stateAfter.items.length).toBe(stateBefore.items.length);
            }
            break;

          case 'example/setLoading':
            expect(stateAfter.loading).toBe(action.payload);
            // Other state should remain unchanged
            expect(stateAfter.items).toEqual(stateBefore.items);
            expect(stateAfter.error).toBe(stateBefore.error);
            expect(stateAfter.counter).toBe(stateBefore.counter);
            break;

          case 'example/setError':
            expect(stateAfter.error).toBe(action.payload);
            // Other state should remain unchanged
            expect(stateAfter.items).toEqual(stateBefore.items);
            expect(stateAfter.loading).toBe(stateBefore.loading);
            expect(stateAfter.counter).toBe(stateBefore.counter);
            break;

          case 'example/incrementCounter':
            expect(stateAfter.counter).toBe(stateBefore.counter + 1);
            // Other state should remain unchanged
            expect(stateAfter.items).toEqual(stateBefore.items);
            expect(stateAfter.loading).toBe(stateBefore.loading);
            expect(stateAfter.error).toBe(stateBefore.error);
            break;

          case 'example/decrementCounter':
            expect(stateAfter.counter).toBe(stateBefore.counter - 1);
            // Other state should remain unchanged
            expect(stateAfter.items).toEqual(stateBefore.items);
            expect(stateAfter.loading).toBe(stateBefore.loading);
            expect(stateAfter.error).toBe(stateBefore.error);
            break;

          case 'example/setCounter':
            expect(stateAfter.counter).toBe(action.payload);
            // Other state should remain unchanged
            expect(stateAfter.items).toEqual(stateBefore.items);
            expect(stateAfter.loading).toBe(stateBefore.loading);
            expect(stateAfter.error).toBe(stateBefore.error);
            break;

          case 'example/clearItems':
            expect(stateAfter.items).toEqual([]);
            // Other state should remain unchanged
            expect(stateAfter.loading).toBe(stateBefore.loading);
            expect(stateAfter.error).toBe(stateBefore.error);
            expect(stateAfter.counter).toBe(stateBefore.counter);
            break;

          case 'example/reset':
            // State should be reset to initial state
            expect(stateAfter.items).toEqual([]);
            expect(stateAfter.loading).toBe(false);
            expect(stateAfter.error).toBe(null);
            expect(stateAfter.counter).toBe(0);
            break;
        }

        return true;
      }),
      { numRuns: 100 } // Run 100 iterations as specified in the design document
    );
  });

  // Additional property test: sequence of actions should maintain state consistency
  it('should maintain state consistency across multiple action dispatches', () => {
    // Generate sequences of actions
    const actionSequenceArbitrary = fc.array(
      fc.oneof(
        fc.string().map(item => addItem(item)),
        fc.boolean().map(loading => setLoading(loading)),
        fc.constant(incrementCounter()),
        fc.constant(decrementCounter()),
        fc.integer({ min: 0, max: 100 }).map(value => setCounter(value))
      ),
      { minLength: 1, maxLength: 20 }
    );

    fc.assert(
      fc.property(actionSequenceArbitrary, (actions) => {
        const store = makeStore();
        
        // Dispatch all actions in sequence
        actions.forEach(action => {
          store.dispatch(action);
        });

        const finalState = store.getState().example;

        // Verify state is consistent (no undefined or invalid values)
        expect(Array.isArray(finalState.items)).toBe(true);
        expect(typeof finalState.loading).toBe('boolean');
        expect(typeof finalState.counter).toBe('number');
        expect(finalState.error === null || typeof finalState.error === 'string').toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
