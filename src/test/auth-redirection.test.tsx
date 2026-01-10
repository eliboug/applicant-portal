import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const mockUseAuth = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function ProtectedPage({ title }: { title: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <LocationDisplay />
    </div>
  );
}

function LoginPage() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleLogin = async () => {
    await mockSignIn('test@example.com', 'password');
  };

  return (
    <div>
      <h1>Login Page</h1>
      <LocationDisplay />
      <p data-testid="redirect-target">Will redirect to: {from}</p>
      <button onClick={handleLogin}>Sign In</button>
    </div>
  );
}


interface TestAppProps {
  initialEntries?: string[];
}

function TestApp({ initialEntries = ['/'] }: TestAppProps) {
  const { user, profile, loading } = mockUseAuth();

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            user ? (
              profile?.role === 'admin' || profile?.role === 'reviewer' ? (
                <ProtectedPage title="Admin Dashboard" />
              ) : (
                <ProtectedPage title="Applicant Dashboard" />
              )
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user && (profile?.role === 'admin' || profile?.role === 'reviewer') ? (
              <ProtectedPage title="Admin Dashboard" />
            ) : user ? (
              <ProtectedPage title="Home - Access Denied" />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/application/:id"
          element={
            user ? (
              <ProtectedPage title="Application Form" />
            ) : (
              <LoginPage />
            )
          }
        />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

describe('Auth Redirection Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue(undefined);
  });

  describe('Unauthenticated User Redirections', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });
    });

    it('should redirect unauthenticated user from home to login', () => {
      render(<TestApp initialEntries={['/']} />);

      expect(screen.getByRole('heading', { name: /login page/i })).toBeInTheDocument();
    });

    it('should redirect unauthenticated user from admin to login', () => {
      render(<TestApp initialEntries={['/admin']} />);

      expect(screen.getByRole('heading', { name: /login page/i })).toBeInTheDocument();
    });

    it('should redirect unauthenticated user from protected application route to login', () => {
      render(<TestApp initialEntries={['/application/123']} />);

      expect(screen.getByRole('heading', { name: /login page/i })).toBeInTheDocument();
    });
  });

  describe('Authenticated Applicant Redirections', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'applicant@example.com' },
        profile: { id: 'user-1', role: 'applicant' },
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });
    });

    it('should show applicant dashboard for authenticated applicant at home', () => {
      render(<TestApp initialEntries={['/']} />);

      expect(screen.getByRole('heading', { name: /applicant dashboard/i })).toBeInTheDocument();
    });

    it('should deny applicant access to admin route', () => {
      render(<TestApp initialEntries={['/admin']} />);

      expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    });

    it('should allow applicant to access application form', () => {
      render(<TestApp initialEntries={['/application/123']} />);

      expect(screen.getByRole('heading', { name: /application form/i })).toBeInTheDocument();
    });
  });

  describe('Authenticated Admin Redirections', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
        profile: { id: 'admin-1', role: 'admin' },
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });
    });

    it('should show admin dashboard for authenticated admin at home', () => {
      render(<TestApp initialEntries={['/']} />);

      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    });

    it('should allow admin access to admin route', () => {
      render(<TestApp initialEntries={['/admin']} />);

      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Authenticated Reviewer Redirections', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'reviewer-1', email: 'reviewer@example.com' },
        profile: { id: 'reviewer-1', role: 'reviewer' },
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });
    });

    it('should show admin dashboard for authenticated reviewer at home', () => {
      render(<TestApp initialEntries={['/']} />);

      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    });

    it('should allow reviewer access to admin route', () => {
      render(<TestApp initialEntries={['/admin']} />);

      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state while auth is initializing', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      render(<TestApp initialEntries={['/']} />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should transition from loading to authenticated state', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      const { rerender } = render(<TestApp initialEntries={['/']} />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        profile: { id: 'user-1', role: 'applicant' },
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      rerender(<TestApp initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /applicant dashboard/i })).toBeInTheDocument();
      });
    });

    it('should transition from loading to unauthenticated state', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      const { rerender } = render(<TestApp initialEntries={['/']} />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      rerender(<TestApp initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /login page/i })).toBeInTheDocument();
      });
    });
  });

  describe('Role Transitions', () => {
    it('should update view when user role changes', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        profile: { id: 'user-1', role: 'applicant' },
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      const { rerender } = render(<TestApp initialEntries={['/']} />);

      expect(screen.getByRole('heading', { name: /applicant dashboard/i })).toBeInTheDocument();

      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        profile: { id: 'user-1', role: 'admin' },
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      rerender(<TestApp initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
      });
    });
  });

  describe('Sign Out Flow', () => {
    it('should redirect to login after sign out', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        profile: { id: 'user-1', role: 'applicant' },
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      const { rerender } = render(<TestApp initialEntries={['/']} />);

      expect(screen.getByRole('heading', { name: /applicant dashboard/i })).toBeInTheDocument();

      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      rerender(<TestApp initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /login page/i })).toBeInTheDocument();
      });
    });
  });

  describe('Deep Link Handling', () => {
    it('should handle deep links to application pages', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        profile: { id: 'user-1', role: 'applicant' },
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      render(<TestApp initialEntries={['/application/abc-123']} />);

      expect(screen.getByRole('heading', { name: /application form/i })).toBeInTheDocument();
    });

    it('should redirect unauthenticated deep links to login', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        signIn: mockSignIn,
        signOut: mockSignOut,
      });

      render(<TestApp initialEntries={['/application/abc-123']} />);

      expect(screen.getByRole('heading', { name: /login page/i })).toBeInTheDocument();
    });
  });
});
