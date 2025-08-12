import React from 'react';
import { LogBox } from 'react-native';

// Suppress all warnings but keep errors visible
LogBox.ignoreAllLogs();

// Also suppress console warnings but keep errors
if (__DEV__) {
  console.warn = () => {};
}

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider key="app-root">
      <AppNavigator />
    </AuthProvider>
  );
}
