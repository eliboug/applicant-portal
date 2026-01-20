import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create client with user's auth for verification
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service role client for database queries
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    const { applicationId } = await req.json()

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'Application ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify application belongs to user and is eligible for payment
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, user_id, first_name, last_name, current_status, payment_verified, stripe_payment_intent_id, stripe_payment_status')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return new Response(
        JSON.stringify({ error: 'Application not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Security: Only allow payment intent creation for submitted, unpaid applications
    if (application.current_status !== 'submitted') {
      return new Response(
        JSON.stringify({ error: 'Application must be submitted before creating payment intent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (application.payment_verified) {
      return new Response(
        JSON.stringify({ error: 'Payment has already been verified for this application' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing payment intent to prevent duplicates (rate limiting)
    if (application.stripe_payment_intent_id && application.stripe_payment_status === 'pending') {
      // Retrieve existing payment intent to check if it's still valid
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(application.stripe_payment_intent_id)

        // If there's a pending/processing payment intent, return it instead of creating new one
        if (existingIntent.status === 'requires_payment_method' ||
            existingIntent.status === 'requires_confirmation' ||
            existingIntent.status === 'requires_action' ||
            existingIntent.status === 'processing') {
          return new Response(
            JSON.stringify({ clientSecret: existingIntent.client_secret }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (err) {
        // If payment intent not found or error, continue to create new one
        console.log('Existing payment intent not found or invalid, creating new one')
      }
    }

    // Create Stripe Payment Intent for embedded payment form
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2000, // $20.00 in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        applicationId: applicationId,
        userId: user.id,
        applicantName: `${application.first_name} ${application.last_name}`,
      },
      receipt_email: user.email,
    })

    // Store payment intent ID and status in database for tracking and rate limiting
    await supabase
      .from('applications')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_status: 'pending',
      })
      .eq('id', applicationId)

    // Return client secret for Payment Element
    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
