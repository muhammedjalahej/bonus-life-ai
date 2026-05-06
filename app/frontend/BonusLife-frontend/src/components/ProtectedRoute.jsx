import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';

/**
 * Protects a route: redirect to login if not authenticated.
 * Use requireAdmin=true for admin-only routes.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}
