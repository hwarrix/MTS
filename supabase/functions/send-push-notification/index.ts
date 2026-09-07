// Edge Function: send-push-notification
// Sends push notifications via Expo Push Notification Service
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id, user_ids, title, body, data } = await req.json()

    // Support single user or batch
    const targetIds: string[] = user_ids ?? (user_id ? [user_id] : [])
    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No user_id(s) specified' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch push tokens for all target users
    const { data: tokens, error: tokenErr } = await supabase
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', targetIds)

    if (tokenErr) throw tokenErr
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build Expo push messages
    const messages = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      badge: 1,
      priority: 'high',
    }))

    // Chunk into batches of 100 (Expo limit)
    const chunks: typeof messages[] = []
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100))
    }

    const results = []
    for (const chunk of chunks) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      })
      const result = await response.json()
      results.push(result)
    }

    // Log notifications in DB for each user
    const notificationRows = targetIds.map((uid) => ({
      recipient_id: uid,
      type: data?.type ?? 'general',
      title,
      body,
      data: data ?? {},
      sent_at: new Date().toISOString(),
    }))
    await supabase.from('notifications').insert(notificationRows)

    return new Response(JSON.stringify({ sent: tokens.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('send-push-notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
