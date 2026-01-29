import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ExampleState {
  items: string[];
  loading: boolean;
  error: string | null;
  counter: number;
}

const initialState: ExampleState = {
  items: [],
  loading: false,
  error: null,
  counter: 0,
};

export const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<string>) => {
      state.items.push(action.payload);
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items.splice(action.payload, 1);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    incrementCounter: (state) => {
      state.counter += 1;
    },
    decrementCounter: (state) => {
      state.counter -= 1;
    },
    setCounter: (state, action: PayloadAction<number>) => {
      state.counter = action.payload;
    },
    clearItems: (state) => {
      state.items = [];
    },
    reset: () => initialState,
  },
});

export const {
  addItem,
  removeItem,
  setLoading,
  setError,
  incrementCounter,
  decrementCounter,
  setCounter,
  clearItems,
  reset,
} = exampleSlice.actions;

export default exampleSlice.reducer;
