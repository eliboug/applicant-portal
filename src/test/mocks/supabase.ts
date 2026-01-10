import { vi } from 'vitest';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
};

export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'applicant' as const,
  created_at: '2024-01-01T00:00:00.000Z',
};

export const mockAdminProfile = {
  ...mockProfile,
  role: 'admin' as const,
};

export const mockReviewerProfile = {
  ...mockProfile,
  role: 'reviewer' as const,
};

export const createMockAuthError = (message: string) => ({
  message,
  status: 400,
  name: 'AuthError',
} as AuthError);

type AuthStateChangeCallback = (
  event: string,
  session: Session | null
) => void;

let authStateCallback: AuthStateChangeCallback | null = null;

export const mockSupabaseAuth = {
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  signInWithPassword: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { session: null, user: mockUser }, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  onAuthStateChange: vi.fn((callback: AuthStateChangeCallback) => {
    authStateCallback = callback;
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
  }),
};

export const triggerAuthStateChange = (event: string, session: Session | null) => {
  if (authStateCallback) {
    authStateCallback(event, session);
  }
};

export const mockSupabaseFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
}));

export const mockSupabase = {
  auth: mockSupabaseAuth,
  from: mockSupabaseFrom,
};

export const resetMocks = () => {
  authStateCallback = null;
  mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseAuth.signInWithPassword.mockResolvedValue({ data: { session: mockSession }, error: null });
  mockSupabaseAuth.signUp.mockResolvedValue({ data: { session: null, user: mockUser }, error: null });
  mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
  });
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));
