// Edge Function: create-payment-intent
// Creates a Stripe PaymentIntent server-side, returns clientSecret to app
// Raw card data NEVER touches our servers — Stripe handles it
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Authenticate caller
    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') ?? ''
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { invoice_id } = await req.json()
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'invoice_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch invoice — RLS ensures patient can only access their own
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select('*, profiles(full_name, phone)')
      .eq('id', invoice_id)
      .eq('patient_id', user.id)
      .single()

    if (invoiceErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (invoice.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Invoice is already paid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get or create Stripe customer
    let customerId = invoice.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: invoice.profiles?.full_name,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('invoices').update({ stripe_customer_id: customerId }).eq('id', invoice_id)
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: invoice.amount_cents,
      currency: invoice.currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        invoice_id,
        patient_id: user.id,
        appointment_id: invoice.appointment_id ?? '',
      },
    })

    // Save the PaymentIntent ID on the invoice
    await supabase
      .from('invoices')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', invoice_id)

    return new Response(JSON.stringify({
      client_secret: paymentIntent.client_secret,
      publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('create-payment-intent error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
