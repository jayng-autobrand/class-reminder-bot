import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, client_id, client_secret, code, redirect_uri, refresh_token } = await req.json()

    if (action === 'exchange') {
      // Exchange authorization code for tokens
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id,
          client_secret,
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return new Response(JSON.stringify({ error: data.error_description || data.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'refresh') {
      // Refresh access token
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id,
          client_secret,
          refresh_token,
          grant_type: 'refresh_token',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return new Response(JSON.stringify({ error: data.error_description || data.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({
        access_token: data.access_token,
        expires_in: data.expires_in,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
