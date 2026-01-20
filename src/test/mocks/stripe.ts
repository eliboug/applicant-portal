/**
 * Mock utilities for Stripe testing
 */

import { vi } from 'vitest'

/**
 * Mock Stripe PaymentIntent object
 */
export function createMockPaymentIntent(overrides: any = {}) {
  return {
    id: 'pi_test_123',
    object: 'payment_intent',
    amount: 2000,
    currency: 'usd',
    status: 'requires_payment_method',
    client_secret: 'pi_test_secret_123',
    metadata: {
      applicationId: 'test-app-id',
      userId: 'test-user-id',
      applicantName: 'Test User',
    },
    ...overrides,
  }
}

/**
 * Mock Stripe webhook event
 */
export function createMockStripeEvent(type: string, paymentIntent: any) {
  return {
    id: 'evt_test_123',
    object: 'event',
    type,
    data: {
      object: paymentIntent,
    },
    created: Date.now(),
  }
}

/**
 * Mock Stripe webhook signature
 */
export function generateMockSignature(payload: string, _secret: string): string {
  // In real implementation, use Stripe's actual signature generation
  // For testing purposes, return a deterministic mock
  return `t=${Date.now()},v1=mock_signature_for_${payload.substring(0, 20)}`
}

/**
 * Mock Stripe.js loadStripe
 */
export function createMockStripeJS() {
  return {
    confirmPayment: vi.fn(),
    confirmCardPayment: vi.fn(),
    confirmSetup: vi.fn(),
    retrievePaymentIntent: vi.fn(),
  }
}

/**
 * Mock @stripe/react-stripe-js hooks
 */
export function createMockStripeHooks(overrides: any = {}) {
  return {
    useStripe: vi.fn(() => ({
      confirmPayment: vi.fn().mockResolvedValue({ error: null }),
      ...overrides.stripe,
    })),
    useElements: vi.fn(() => ({
      getElement: vi.fn(),
      ...overrides.elements,
    })),
  }
}
