import React from 'react';
import { AuthProvider } from './AuthContex';
import Root from './Root';

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
