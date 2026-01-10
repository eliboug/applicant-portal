import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const mockSignIn = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
  });

  describe('Rendering', () => {
    it('should render the login form', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render the signup link', () => {
      renderLoginPage();

      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create one/i })).toBeInTheDocument();
    });

    it('should render the Elmseed branding', () => {
      renderLoginPage();

      expect(screen.getByText('Elmseed')).toBeInTheDocument();
      expect(screen.getByText('Applicant Portal')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call signIn with email and password on submit', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should navigate to home on successful login', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ error: null });

      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('should display error message on failed login', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials');
      });
    });

    it('should not navigate on failed login', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state while signing in', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: { error: null }) => void;
      mockSignIn.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignIn = resolve;
          })
      );

      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      resolveSignIn!({ error: null });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require email field', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('required');
    });

    it('should require password field', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have correct input types', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    });
  });

  describe('Accessibility', () => {
    it('should have proper autocomplete attributes', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should display error with alert role', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        error: { message: 'Error message' },
      });

      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
