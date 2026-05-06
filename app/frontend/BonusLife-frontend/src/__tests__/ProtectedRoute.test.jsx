import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';

// Mock the AuthContext module so we can control user/loading state
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

function renderWithRouter(element, { initialEntries = ['/protected'] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login when user is null (not authenticated)', () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    renderWithRouter(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    useAuth.mockReturnValue({
      user: { id: 1, email: 'test@example.com', role: 'user' },
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('shows a loading spinner while authentication is being checked', () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    const { container } = renderWithRouter(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    // While loading, neither the redirect nor the children should render
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    // A spinner element should be present
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects non-admin user away from admin route', () => {
    useAuth.mockReturnValue({
      user: { id: 1, email: 'test@example.com', role: 'user' },
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute requireAdmin>
        <div>Admin Only Content</div>
      </ProtectedRoute>
    );

    // Regular user gets redirected to dashboard, not login
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
  });

  it('renders admin content when user has admin role', () => {
    useAuth.mockReturnValue({
      user: { id: 2, email: 'admin@example.com', role: 'admin' },
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute requireAdmin>
        <div>Admin Only Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
  });
});
