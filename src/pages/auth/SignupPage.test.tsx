import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SignupPage } from './SignupPage';

const mockSignUp = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderSignupPage() {
  return render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>
  );
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
  });

  describe('Rendering', () => {
    it('should render the signup form', () => {
      renderSignupPage();

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render the login link', () => {
      renderSignupPage();

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render the Elmseed branding', () => {
      renderSignupPage();

      expect(screen.getByText('Elmseed')).toBeInTheDocument();
      expect(screen.getByText('Applicant Portal')).toBeInTheDocument();
    });

    it('should show password hint', () => {
      renderSignupPage();

      expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call signUp with form data on submit', async () => {
      const user = userEvent.setup();
      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
    });

    it('should show success message after signup', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: null });

      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should display error message on failed signup', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({
        error: { message: 'User already registered' },
      });

      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('User already registered');
      });
    });
  });

  describe('Password Validation', () => {
    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should show error when password is too short', async () => {
      const user = userEvent.setup();
      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'short');
      await user.type(screen.getByLabelText(/confirm password/i), 'short');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('Success State', () => {
    it('should show confirmation email message after successful signup', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: null });

      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });
    });

    it('should show return to sign in button after successful signup', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: null });

      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /return to sign in/i })).toBeInTheDocument();
      });
    });

    it('should navigate to login when clicking return to sign in', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ error: null });

      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /return to sign in/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /return to sign in/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Form Validation', () => {
    it('should require email field', () => {
      renderSignupPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('required');
    });

    it('should require password field', () => {
      renderSignupPage();

      const passwordInput = screen.getByLabelText(/^password/i);
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should require confirm password field', () => {
      renderSignupPage();

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      expect(confirmPasswordInput).toHaveAttribute('required');
    });

    it('should not require full name field', () => {
      renderSignupPage();

      const fullNameInput = screen.getByLabelText(/full name/i);
      expect(fullNameInput).not.toHaveAttribute('required');
    });

    it('should have correct input types', () => {
      renderSignupPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password');
    });
  });

  describe('Accessibility', () => {
    it('should have proper autocomplete attributes', () => {
      renderSignupPage();

      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('autocomplete', 'name');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
      expect(screen.getByLabelText(/^password/i)).toHaveAttribute('autocomplete', 'new-password');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('autocomplete', 'new-password');
    });

    it('should display error with alert role', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({
        error: { message: 'Error message' },
      });

      renderSignupPage();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
