# Stripe Payment Integration Setup Guide

## Overview
This application uses Stripe Checkout for processing $20 application fees. The integration includes:
- Stripe Checkout Sessions for payment processing
- Webhook handlers for payment verification
- Automatic application status updates

## Components Deployed

### 1. Stripe Product & Price
- **Product ID**: `prod_Tp1BusbJN5mS8U`
- **Product Name**: Application Fee
- **Price ID**: `price_1SrN8p1hsW6dYn4ZfS8vwhWs`
- **Amount**: $20.00 USD (one-time payment)

### 2. Supabase Edge Functions
- **create-payment-intent**: Creates Stripe Checkout Sessions
  - Endpoint: `https://wcxtksnwtoyskctqkdqw.supabase.co/functions/v1/create-payment-intent`
  - Requires JWT authentication
  
- **stripe-webhook**: Handles Stripe webhook events
  - Endpoint: `https://wcxtksnwtoyskctqkdqw.supabase.co/functions/v1/stripe-webhook`
  - No JWT required (verified via webhook signature)

### 3. Test Payment Link
🔗 **Test Link**: https://buy.stripe.com/test_14A7sD6h03755J24364ko00

Use test card: `4242 4242 4242 4242` with any future expiry and CVC.

## Required Environment Variables

You need to set these in your Supabase project:

### In Supabase Dashboard (Settings → Edge Functions → Secrets):

1. **STRIPE_SECRET_KEY**
   - Your Stripe secret key (starts with `sk_test_` for test mode)
   - Get from: https://dashboard.stripe.com/test/apikeys

2. **STRIPE_WEBHOOK_SECRET**
   - Webhook signing secret (starts with `whsec_`)
   - Get from Stripe Dashboard after creating webhook endpoint (see below)

3. **APP_URL**
   - Your frontend application URL
   - Value: `https://elmseedapplications.web.app`

### In Your Frontend (.env file):

1. **VITE_STRIPE_PUBLISHABLE_KEY**
   - Your Stripe publishable key (starts with `pk_test_` for test mode)
   - Get from: https://dashboard.stripe.com/test/apikeys

## Stripe Webhook Configuration

### Step 1: Create Webhook Endpoint in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://wcxtksnwtoyskctqkdqw.supabase.co/functions/v1/stripe-webhook
   ```

### Step 2: Select Events to Listen For

Add these events:
- ✅ `checkout.session.completed` - Payment successful
- ✅ `checkout.session.expired` - Session expired without payment

### Step 3: Get Webhook Signing Secret

1. After creating the endpoint, click on it
2. Click **"Reveal"** under "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Add it to Supabase as `STRIPE_WEBHOOK_SECRET`

## Payment Flow

### User Journey:
1. User fills out application form
2. User selects "Stripe" as payment method
3. User clicks "Pay with Stripe" button
4. User is redirected to Stripe Checkout page
5. User completes payment with card details
6. User is redirected back to `/status?session_id={CHECKOUT_SESSION_ID}`
7. Success banner is displayed
8. Webhook updates application status to `payment_received`

### Backend Flow:
1. Frontend calls `create-payment-intent` edge function
2. Edge function creates Stripe Checkout Session
3. Edge function updates application with `stripe_session_id`
4. User completes payment on Stripe
5. Stripe sends webhook to `stripe-webhook` edge function
6. Webhook verifies payment and updates application:
   - Sets `payment_verified = true`
   - Sets `payment_verified_at = NOW()`
   - Sets `stripe_payment_status = 'succeeded'`
   - Sets `current_status = 'payment_received'`

## Database Schema Updates

The following fields are used in the `applications` table:
- `stripe_session_id` - Checkout Session ID
- `stripe_payment_intent_id` - Payment Intent ID (set by webhook)
- `stripe_payment_status` - Status: pending, succeeded, expired, failed
- `payment_method` - Set to 'stripe'
- `payment_verified` - Boolean flag
- `payment_verified_at` - Timestamp
- `submitted_at` - Timestamp when application was submitted

## Testing

### Test Cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

### Test the Integration:

1. **Test Payment Link** (standalone):
   - Visit: https://buy.stripe.com/test_14A7sD6h03755J24364ko00
   - Complete payment with test card
   - Check Stripe Dashboard for payment

2. **Test Full Application Flow**:
   - Create/login to applicant account
   - Fill out application form
   - Select Stripe payment method
   - Click "Pay with Stripe"
   - Complete payment on Stripe Checkout
   - Verify redirect back to application
   - Check application status updated to "payment_received"

3. **Test Webhook**:
   - Use Stripe CLI for local testing:
     ```bash
     stripe listen --forward-to https://wcxtksnwtoyskctqkdqw.supabase.co/functions/v1/stripe-webhook
     ```
   - Trigger test events:
     ```bash
     stripe trigger checkout.session.completed
     ```

## Monitoring

### Stripe Dashboard:
- View payments: https://dashboard.stripe.com/test/payments
- View webhook events: https://dashboard.stripe.com/test/webhooks
- View logs for webhook deliveries

### Supabase Logs:
- Edge function logs: Supabase Dashboard → Edge Functions → Logs
- Check for webhook processing errors

## Going Live

When ready to go live:

1. **Switch to Live Mode in Stripe**:
   - Get live API keys from https://dashboard.stripe.com/apikeys
   - Update `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY`

2. **Create Live Webhook Endpoint**:
   - Same URL, but in live mode
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook secret

3. **Create Live Product & Price**:
   - Copy test product to live mode in Stripe Dashboard
   - Update price ID in `create-payment-intent/index.ts` (line 74)
   - Redeploy edge function

4. **Test with Real Card**:
   - Use a real card in small amount first
   - Verify full flow works
   - Refund test payment

## Troubleshooting

### Payment not updating application status:
1. Check webhook is configured correctly in Stripe
2. Check `STRIPE_WEBHOOK_SECRET` is set in Supabase
3. Check webhook logs in Stripe Dashboard
4. Check edge function logs in Supabase

### Checkout Session creation fails:
1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check price ID is correct in edge function
3. Check edge function logs for errors

### User not redirected after payment:
1. Verify `APP_URL` environment variable is set
2. Check success_url in Checkout Session creation
3. Verify frontend route `/status` exists

## Support

- Stripe Documentation: https://docs.stripe.com/checkout
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Test Cards: https://docs.stripe.com/testing
