import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { SplashScreen } from './components/common/SplashScreen';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Studio from './pages/Studio';

export default function App() {
  const [splashComplete, setSplashComplete] = useState(false);

  if (!splashComplete) {
    return (
      <ThemeProvider>
        <SplashScreen onComplete={() => setSplashComplete(true)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/studio/:projectId"
              element={
                <ProtectedRoute>
                  <Studio />
                </ProtectedRoute>
              }
            />

            {/* Fallback to Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
