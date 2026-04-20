import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function Spinner() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-[var(--text)]/30 text-sm">Loading…</p>
      </div>
    </div>
  );
}

// Requires login. Optional roles array e.g. roles={['admin']}
export function ProtectedRoute({ children, roles }) {
  const { user, role, initialized } = useAuthStore();
  if (!initialized) return <Spinner />;
  if (!user) {
    // If trying to access admin area, redirect to admin login
    if (roles?.includes('admin')) return <Navigate to="/empire/login" replace />;
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}

// Redirects logged-in users away from auth pages
export function GuestRoute({ children }) {
  const { user, role, initialized } = useAuthStore();
  if (!initialized) return <Spinner />;
  if (user) {
    if (role === 'admin')    return <Navigate to="/empire"    replace />;
    if (role === 'provider') return <Navigate to="/provider" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
