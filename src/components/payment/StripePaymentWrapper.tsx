import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import styles from './StripePaymentWrapper.module.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripePaymentWrapperProps {
  applicationId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

function PaymentForm({ applicationId, onSuccess, onCancel }: StripePaymentWrapperProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/status?application_id=${applicationId}`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setLoading(false);
    } else {
      // Payment succeeded - show success message
      setLoading(false);
      setPaymentSuccess(true);
      
      // Wait for webhook to process (give it a moment)
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  };

  if (paymentSuccess) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successIcon}>✓</div>
        <h3 style={{ color: 'var(--color-elm-green)', margin: '1rem 0 0.5rem' }}>Payment Successful!</h3>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Your $20 application fee has been processed.</p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>Updating your application status...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.paymentForm}>
      <PaymentElement />
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <Button type="submit" disabled={!stripe || loading} variant="primary">
          {loading ? 'Processing...' : 'Pay $20.00'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function StripePaymentWrapper({ applicationId, onSuccess, onCancel }: StripePaymentWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setError('You must be logged in to make a payment.');
          setLoading(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ applicationId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [applicationId]);

  if (loading) {
    return (
      <div className={styles.paymentContainer}>
        <p>Loading payment form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const appearance = {
    theme: 'stripe' as const,
  };

  return (
    <div className={styles.paymentContainer}>
      <div className={styles.paymentInfo}>
        <h4>Application Fee: $20.00</h4>
        <p>Enter your payment details below to complete your application.</p>
      </div>
      <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
        <PaymentForm applicationId={applicationId} onSuccess={onSuccess} onCancel={onCancel} />
      </Elements>
    </div>
  );
}
