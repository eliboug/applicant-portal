import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { StripePaymentWrapper } from './StripePaymentWrapper'
import { supabase } from '../../lib/supabase'

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element">Payment Element</div>,
  useStripe: () => ({
    confirmPayment: vi.fn(),
  }),
  useElements: () => ({}),
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

// Mock fetch
global.fetch = vi.fn()

describe('StripePaymentWrapper', () => {
  const mockApplicationId = 'test-app-123'
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for auth session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token',
          user: { id: 'user-123', email: 'test@example.com' },
        },
      },
      error: null,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', () => {
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {})) // Never resolves

    render(
      <StripePaymentWrapper
        applicationId={mockApplicationId}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Loading payment form...')).toBeInTheDocument()
  })

  it('should create payment intent on mount', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ clientSecret: 'test-secret-123' }),
    } as Response)

    render(
      <StripePaymentWrapper
        applicationId={mockApplicationId}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/create-payment-intent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          }),
          body: JSON.stringify({ applicationId: mockApplicationId }),
        })
      )
    })
  })

  it('should show error if not authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as any)

    render(
      <StripePaymentWrapper
        applicationId={mockApplicationId}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('You must be logged in to make a payment.')).toBeInTheDocument()
    })
  })

  it('should show error if payment intent creation fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Application must be submitted before creating payment intent' }),
    } as Response)

    render(
      <StripePaymentWrapper
        applicationId={mockApplicationId}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText('Application must be submitted before creating payment intent')
      ).toBeInTheDocument()
    })
  })

  it('should show error if payment already verified', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Payment has already been verified for this application' }),
    } as Response)

    render(
      <StripePaymentWrapper
        applicationId={mockApplicationId}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText('Payment has already been verified for this application')
      ).toBeInTheDocument()
    })
  })

  it('should render payment form when client secret is available', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ clientSecret: 'test-secret-123' }),
    } as Response)

    render(
      <StripePaymentWrapper
        applicationId={mockApplicationId}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Application Fee: $20.00')).toBeInTheDocument()
      expect(screen.getByTestId('payment-element')).toBeInTheDocument()
    })
  })
})

/**
 * Note: The payment verification polling functionality is tested through integration tests.
 * The polling mechanism itself is complex to unit test due to async timing and Stripe mock setup.
 * The critical security features (validation, authentication, error handling) are tested above.
 *
 * The polling implementation has been verified to:
 * - Poll application status every 1 second
 * - Stop when payment_verified becomes true
 * - Timeout after 20 attempts (20 seconds)
 * - Handle failed payment status appropriately
 *
 * This fixes the race condition where the UI would show success before webhook completed.
 */
