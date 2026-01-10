import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function TestComponent({ text }: { text: string }) {
  return <div data-testid="protected-content">{text}</div>;
}

function LoginPage() {
  return <div data-testid="login-page">Login Page</div>;
}

function HomePage() {
  return <div data-testid="home-page">Home Page</div>;
}

interface TestRouterProps {
  initialEntries?: string[];
  children: ReactNode;
}

function TestRouter({ initialEntries = ['/protected'], children }: TestRouterProps) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/protected" element={children} />
        <Route path="/admin" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      });

      render(
        <TestRouter>
          <ProtectedRoute>
            <TestComponent text="Protected" />
          </ProtectedRoute>
        </TestRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated Access', () => {
    it('should redirect to login when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
      });

      render(
        <TestRouter>
          <ProtectedRoute>
            <TestComponent text="Protected" />
          </ProtectedRoute>
        </TestRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should preserve the original location in state when redirecting', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
      });

      render(
        <TestRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent text="Protected" />
          </ProtectedRoute>
        </TestRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated Access', () => {
    it('should render children when user is authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: { id: 'test-user-id', role: 'applicant' },
        loading: false,
      });

      render(
        <TestRouter>
          <ProtectedRoute>
            <TestComponent text="Protected Content" />
          </ProtectedRoute>
        </TestRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render children without role restrictions', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: { id: 'test-user-id', role: 'applicant' },
        loading: false,
      });

      render(
        <TestRouter>
          <ProtectedRoute>
            <TestComponent text="No Role Required" />
          </ProtectedRoute>
        </TestRouter>
      );

      expect(screen.getByText('No Role Required')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access', () => {
    it('should allow access when user has required role', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: { id: 'test-user-id', role: 'admin' },
        loading: false,
      });

      render(
        <TestRouter initialEntries={['/admin']}>
          <ProtectedRoute allowedRoles={['admin']}>
            <TestComponent text="Admin Content" />
          </ProtectedRoute>
        </TestRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should allow access when user has one of multiple allowed roles', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: { id: 'test-user-id', role: 'reviewer' },
        loading: false,
      });

      render(
        <TestRouter initialEntries={['/admin']}>
          <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
            <TestComponent text="Admin or Reviewer Content" />
          </ProtectedRoute>
        </TestRouter>
      );

      expect(screen.getByText('Admin or Reviewer Content')).toBeInTheDocument();
    });

    it('should redirect to home when user does not have required role', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: { id: 'test-user-id', role: 'applicant' },
        loading: false,
      });

      render(
        <TestRouter initialEntries={['/admin']}>
          <ProtectedRoute allowedRoles={['admin']}>
            <TestComponent text="Admin Only" />
          </ProtectedRoute>
        </TestRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
    });

    it('should redirect applicant trying to access admin route', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: { id: 'test-user-id', role: 'applicant' },
        loading: false,
      });

      render(
        <TestRouter initialEntries={['/admin']}>
          <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
            <TestComponent text="Staff Only" />
          </ProtectedRoute>
        </TestRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('should allow admin to access any role-restricted route', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: { id: 'test-user-id', role: 'admin' },
        loading: false,
      });

      render(
        <TestRouter initialEntries={['/admin']}>
          <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
            <TestComponent text="Staff Content" />
          </ProtectedRoute>
        </TestRouter>
      );

      expect(screen.getByText('Staff Content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user without profile gracefully', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: null,
        loading: false,
      });

      render(
        <TestRouter>
          <ProtectedRoute>
            <TestComponent text="Content" />
          </ProtectedRoute>
        </TestRouter>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should handle user without profile when roles are required', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: null,
        loading: false,
      });

      render(
        <TestRouter initialEntries={['/admin']}>
          <ProtectedRoute allowedRoles={['admin']}>
            <TestComponent text="Admin Content" />
          </ProtectedRoute>
        </TestRouter>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should transition from loading to authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      });

      const { rerender } = render(
        <TestRouter>
          <ProtectedRoute>
            <TestComponent text="Protected" />
          </ProtectedRoute>
        </TestRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: { id: 'test-user-id', role: 'applicant' },
        loading: false,
      });

      rerender(
        <TestRouter>
          <ProtectedRoute>
            <TestComponent text="Protected" />
          </ProtectedRoute>
        </TestRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected')).toBeInTheDocument();
      });
    });
  });
});
