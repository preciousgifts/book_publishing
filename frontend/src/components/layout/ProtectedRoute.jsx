import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowClockwise } from '@phosphor-icons/react';

export function ProtectedRoute({ children }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-textMuted transition-micro animate-fade-in">
        <ArrowClockwise weight="bold" className="animate-spin h-6 w-6 text-brand-primary mr-3" />
        <span className="font-sans text-sm font-medium">Verifying auth session...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="animate-fade-in transition-micro h-full w-full">
      {children}
    </div>
  );
}
