import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'No signature provided' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const applicationId = paymentIntent.metadata?.applicationId

      if (!applicationId) {
        console.error('No applicationId in payment intent metadata')
        return new Response(
          JSON.stringify({ error: 'Missing application ID' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Update application with payment success
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          payment_verified: true,
          payment_verified_at: new Date().toISOString(),
          stripe_payment_status: 'succeeded',
          stripe_payment_intent_id: paymentIntent.id,
          current_status: 'payment_received',
        })
        .eq('id', applicationId)

      if (updateError) {
        console.error('Error updating application:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update application' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Payment verified for application ${applicationId}`)
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const applicationId = paymentIntent.metadata?.applicationId

      if (applicationId) {
        await supabase
          .from('applications')
          .update({
            stripe_payment_status: 'failed',
          })
          .eq('id', applicationId)

        console.log(`Payment failed for application ${applicationId}`)
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
