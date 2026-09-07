// Edge Function: book-appointment
// Wraps the PostgreSQL book_appointment() RPC for transactional, concurrency-safe booking
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get calling user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { slot_id, notes } = await req.json()
    if (!slot_id) {
      return new Response(JSON.stringify({ error: 'slot_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Call the PostgreSQL function (handles locking + transaction internally)
    const { data, error } = await supabase.rpc('book_appointment', {
      p_slot_id: slot_id,
      p_patient_id: user.id,
      p_notes: notes ?? null,
    })

    if (error) throw error

    if (!data.success) {
      return new Response(JSON.stringify({ error: data.error }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create an invoice for this appointment (amount set by manager later)
    await supabase.from('invoices').insert({
      appointment_id: data.appointment_id,
      patient_id: user.id,
      doctor_id: data.doctor_id,
      amount_cents: 0,
      status: 'pending',
    })

    // Create in-app notification
    await supabase.from('notifications').insert({
      recipient_id: user.id,
      type: 'appointment_booked',
      title: 'Appointment Confirmed',
      body: 'Your appointment has been successfully booked.',
      data: { appointment_id: data.appointment_id },
    })

    // Trigger push notification via send-push-notification function
    await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: user.id,
        title: '✅ Appointment Confirmed',
        body: 'Your appointment has been successfully booked.',
        data: { type: 'appointment_booked', appointment_id: data.appointment_id },
      },
    })

    return new Response(JSON.stringify({ success: true, ...data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('book-appointment error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
