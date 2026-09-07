// Edge Function: get-signed-url
// Returns a short-lived signed URL for a private storage file
// This is the ONLY way to access private buckets — never expose raw storage paths
// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SIGNED_URL_EXPIRY_SECONDS = 900 // 15 minutes

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') ?? ''
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { bucket, path } = await req.json()
    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: 'bucket and path are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authorization checks based on bucket and user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role

    // doctor-credentials: only the owning doctor or a manager can access
    if (bucket === 'doctor-credentials') {
      const doctorId = path.split('/')[0] // paths are: {doctor_id}/{filename}
      if (userRole !== 'manager' && user.id !== doctorId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // insurance-cards: only the owning patient or a manager can access
    if (bucket === 'insurance-cards') {
      const patientId = path.split('/')[0] // paths are: {patient_id}/{filename}
      if (userRole !== 'manager' && user.id !== patientId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Generate the signed URL using the service-role client (bypasses RLS for storage)
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)

    if (signedErr || !signedData) {
      throw signedErr ?? new Error('Failed to create signed URL')
    }

    return new Response(JSON.stringify({
      signed_url: signedData.signedUrl,
      expires_in: SIGNED_URL_EXPIRY_SECONDS,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('get-signed-url error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
