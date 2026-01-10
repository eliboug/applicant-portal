import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from './AuthContext';

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'applicant' as const,
  created_at: '2024-01-01T00:00:00.000Z',
};

const mockAdminProfile = {
  ...mockProfile,
  role: 'admin' as const,
};

const createMockAuthError = (message: string) =>
  ({ message, status: 400, name: 'AuthError' }) as AuthError;

const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInWithPassword: (creds: unknown) => mockSignInWithPassword(creds),
      signUp: (creds: unknown) => mockSignUp(creds),
      signOut: () => mockSignOut(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
    },
    from: (table: string) => mockFrom(table),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInWithPassword.mockResolvedValue({ data: { session: mockSession }, error: null });
    mockSignUp.mockResolvedValue({ data: { session: null, user: mockSession.user }, error: null });
    mockSignOut.mockResolvedValue({ error: null });
    
    // Mock onAuthStateChange to immediately call the callback with no session
    mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
      // Simulate initial state - no session
      setTimeout(() => callback('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    });
  });

  describe('Initial State', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.loading).toBe(true);
    });

    it('should have null user, profile, and session initially', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('Session Initialization', () => {
    it('should load existing session on mount', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.session).toEqual(mockSession);
    });

    it('should fetch profile when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('should handle session fetch error gracefully', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'Network error' } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('Sign In', () => {
    it('should sign in successfully with valid credentials', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { error } = await result.current.signIn('test@example.com', 'password123');

      expect(error).toBeNull();
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error for invalid credentials', async () => {
      const authError = createMockAuthError('Invalid login credentials');
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { error } = await result.current.signIn('wrong@example.com', 'wrongpassword');

      expect(error).toBeTruthy();
      expect(error?.message).toBe('Invalid login credentials');
    });

    it('should return error for empty email', async () => {
      const authError = createMockAuthError('Email is required');
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { error } = await result.current.signIn('', 'password123');

      expect(error?.message).toBe('Email is required');
    });
  });

  describe('Sign Up', () => {
    it('should sign up successfully with valid data', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { error } = await result.current.signUp('new@example.com', 'password123', 'New User');

      expect(error).toBeNull();
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: { full_name: 'New User' },
        },
      });
    });

    it('should sign up without full name', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { error } = await result.current.signUp('new@example.com', 'password123');

      expect(error).toBeNull();
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: { full_name: undefined },
        },
      });
    });

    it('should return error for existing email', async () => {
      const authError = createMockAuthError('User already registered');
      mockSignUp.mockResolvedValue({
        data: { session: null, user: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { error } = await result.current.signUp('existing@example.com', 'password123');

      expect(error?.message).toBe('User already registered');
    });

    it('should return error for weak password', async () => {
      const authError = createMockAuthError('Password should be at least 6 characters');
      mockSignUp.mockResolvedValue({
        data: { session: null, user: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { error } = await result.current.signUp('new@example.com', '123');

      expect(error?.message).toBe('Password should be at least 6 characters');
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('Role Checking', () => {
    it('should correctly identify applicant role', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.profile).toBeTruthy();
      });

      expect(result.current.isRole('applicant')).toBe(true);
      expect(result.current.isRole('admin')).toBe(false);
      expect(result.current.isRole('reviewer')).toBe(false);
    });

    it('should correctly identify admin role', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAdminProfile, error: null }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.profile?.role).toBe('admin');
      });

      expect(result.current.isRole('admin')).toBe(true);
      expect(result.current.isRole('applicant')).toBe(false);
    });

    it('should return false when no profile exists', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isRole('applicant')).toBe(false);
      expect(result.current.isRole('admin')).toBe(false);
    });
  });

  describe('Auth State Changes', () => {
    it('should handle SIGNED_IN event', async () => {
      let authCallback: ((event: string, session: Session | null) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        authCallback = callback;
        setTimeout(() => callback('INITIAL_SESSION', null), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      await act(async () => {
        authCallback?.('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSession.user);
      });
    });

    it('should handle SIGNED_OUT event', async () => {
      let authCallback: ((event: string, session: Session | null) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        authCallback = callback;
        setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      await act(async () => {
        authCallback?.('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
      });
    });

    it('should unsubscribe on unmount', async () => {
      const unsubscribeMock = vi.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } },
      });

      const { unmount } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Profile Fetching', () => {
    it('should handle profile fetch error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Profile not found' } }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.profile).toBeNull();
    });

    it('should not fetch profile when no session', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});
