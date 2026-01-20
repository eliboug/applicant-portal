# Stripe Integration Setup Checklist

## ✅ Completed
- [x] Stripe product created: Application Fee ($20)
- [x] Stripe price created: `price_1SrN8p1hsW6dYn4ZfS8vwhWs`
- [x] Edge functions deployed to Supabase
- [x] Frontend code updated with Stripe Checkout integration
- [x] Frontend built successfully
- [x] Test payment link created

## 🔧 Required Actions

### 1. Deploy Frontend to Firebase
Run this command to deploy the built application:
```bash
firebase deploy --only hosting
```

### 2. Set Supabase Environment Variables

Go to: https://supabase.com/dashboard/project/wcxtksnwtoyskctqkdqw/settings/functions

Add these secrets:

#### STRIPE_SECRET_KEY
- Get from: https://dashboard.stripe.com/test/apikeys
- Value: Your test secret key (starts with `sk_test_`)

#### STRIPE_WEBHOOK_SECRET
- Get this AFTER creating the webhook endpoint (step 3)
- Value: Webhook signing secret (starts with `whsec_`)

#### APP_URL (Optional)
- Value: `https://elmseedapplications.web.app`
- Note: Already has fallback in code, but recommended to set

### 3. Configure Stripe Webhook

**Step-by-step:**

1. Go to: https://dashboard.stripe.com/test/webhooks/create

2. Click **"Add endpoint"**

3. Enter endpoint URL:
   ```
   https://wcxtksnwtoyskctqkdqw.supabase.co/functions/v1/stripe-webhook
   ```

4. Under "Select events to listen to", choose:
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.expired`

5. Click **"Add endpoint"**

6. On the webhook details page, click **"Reveal"** under "Signing secret"

7. Copy the secret (starts with `whsec_`)

8. Add it to Supabase as `STRIPE_WEBHOOK_SECRET` (see step 2)

### 4. Test the Integration

**Test Payment Link (Standalone):**
https://buy.stripe.com/test_14A7sD6h03755J24364ko00

**Test Card:**
- Card Number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Full Application Flow Test:**
1. Go to: https://elmseedapplications.web.app (after deploying)
2. Create/login to an applicant account
3. Fill out application form
4. Select "Stripe" as payment method
5. Click "Pay with Stripe"
6. Complete payment with test card
7. Verify redirect back to `/status` page
8. Check success message appears
9. Verify in admin dashboard that status is "payment_received"

## 🔍 Verification

### Check Stripe Dashboard:
- Payments: https://dashboard.stripe.com/test/payments
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Check webhook delivery logs

### Check Supabase:
- Edge Function Logs: https://supabase.com/dashboard/project/wcxtksnwtoyskctqkdqw/functions/create-payment-intent/logs
- Database: Check `applications` table for updated payment fields

### Expected Database Updates After Payment:
- `stripe_session_id`: Set to Checkout Session ID
- `stripe_payment_intent_id`: Set by webhook
- `stripe_payment_status`: `succeeded`
- `payment_verified`: `true`
- `payment_verified_at`: Timestamp
- `payment_method`: `stripe`
- `current_status`: `payment_received`

## 🚨 Troubleshooting

### Payment not updating application:
1. Check webhook is receiving events in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly in Supabase
3. Check edge function logs for errors
4. Ensure webhook events include `checkout.session.completed`

### Checkout Session creation fails:
1. Verify `STRIPE_SECRET_KEY` is set in Supabase
2. Check price ID is correct: `price_1SrN8p1hsW6dYn4ZfS8vwhWs`
3. Check edge function logs

### User not redirected after payment:
1. Verify success_url in Checkout Session
2. Check browser console for errors
3. Ensure `/status` route exists in frontend

## 📱 URLs Reference

**Production:**
- Frontend: https://elmseedapplications.web.app
- Localhost: http://localhost:5173

**Supabase:**
- Project: https://wcxtksnwtoyskctqkdqw.supabase.co
- Checkout Function: https://wcxtksnwtoyskctqkdqw.supabase.co/functions/v1/create-payment-intent
- Webhook Function: https://wcxtksnwtoyskctqkdqw.supabase.co/functions/v1/stripe-webhook

**Stripe:**
- Dashboard: https://dashboard.stripe.com/test
- Webhooks: https://dashboard.stripe.com/test/webhooks
- API Keys: https://dashboard.stripe.com/test/apikeys

## 🎯 Quick Commands

```bash
# Build frontend
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Test locally
npm run dev
# Then visit: http://localhost:5173
```

## ✨ Next Steps After Testing

Once everything works in test mode:

1. **Get Live Stripe Keys**
   - Switch to live mode in Stripe Dashboard
   - Get live API keys

2. **Update Environment Variables**
   - Replace test keys with live keys in Supabase
   - Update `VITE_STRIPE_PUBLISHABLE_KEY` in frontend

3. **Create Live Webhook**
   - Same URL, but in live mode
   - Update `STRIPE_WEBHOOK_SECRET` with live secret

4. **Update Price ID**
   - Create live product/price or copy from test
   - Update price ID in edge function if different
   - Redeploy edge function

5. **Test with Real Card**
   - Small test payment
   - Verify full flow
   - Refund test payment

## 📞 Support Resources

- Stripe Docs: https://docs.stripe.com/checkout
- Supabase Docs: https://supabase.com/docs/guides/functions
- Test Cards: https://docs.stripe.com/testing
