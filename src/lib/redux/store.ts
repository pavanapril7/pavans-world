import { configureStore } from '@reduxjs/toolkit';
import exampleReducer from './slices/exampleSlice';
import locationReducer from './slices/locationSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      example: exampleReducer,
      location: locationReducer,
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
