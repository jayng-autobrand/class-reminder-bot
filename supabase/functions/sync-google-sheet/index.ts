import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

async function refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.error)
  return { access_token: data.access_token, expires_in: data.expires_in }
}

function extractSheetId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match?.[1] || url.trim()
}

async function getFirstSheetName(token: string, spreadsheetId: string): Promise<string> {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Failed to get sheet info: ${res.statusText}`)
  const data = await res.json()
  return data.sheets?.[0]?.properties?.title || "Sheet1"
}

async function readSheet(token: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${range}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Failed to read sheet: ${res.statusText}`)
  return (await res.json()).values || []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get all enabled sync settings
    const { data: syncSettings, error: fetchError } = await supabase
      .from('sync_settings')
      .select('*')
      .eq('sync_enabled', true)
      .neq('sheet_url', '')
      .neq('refresh_token', '')

    if (fetchError) throw fetchError
    if (!syncSettings || syncSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'No sync settings configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results = []

    for (const settings of syncSettings) {
      try {
        const userId = settings.user_id
        // Get valid access token
        let accessToken = settings.access_token
        const now = Date.now()

        if (!accessToken || now > (settings.expires_at - 60000)) {
          // Refresh token
          const refreshed = await refreshAccessToken(
            settings.client_id,
            settings.client_secret,
            settings.refresh_token
          )
          accessToken = refreshed.access_token

          // Update tokens in DB
          await supabase.from('sync_settings').update({
            access_token: refreshed.access_token,
            expires_at: now + refreshed.expires_in * 1000,
          }).eq('id', settings.id)
        }

        // Read the Google Sheet
        const spreadsheetId = extractSheetId(settings.sheet_url)
        const sheetName = await getFirstSheetName(accessToken, spreadsheetId)
        const rows = await readSheet(accessToken, spreadsheetId, sheetName)

        if (rows.length < 2) {
          results.push({ user_id: settings.user_id, status: 'skipped', reason: 'no data rows' })
          continue
        }

        // Get existing courses for this user
        const { data: courses } = await supabase.from('courses').select('id, name').eq('user_id', userId)
        const courseMap = new Map((courses || []).map((c: any) => [c.name, c.id]))

        // Find and create missing courses
        const missingNames = new Set<string>()
        rows.slice(1).forEach((r) => {
          const courseName = (r[3] || '').trim()
          if (courseName && !courseMap.has(courseName)) missingNames.add(courseName)
        })

        if (missingNames.size > 0) {
          const today = new Date().toISOString().split('T')[0]
          const newCourses = Array.from(missingNames).map((name) => ({
            name, type: '', date: today, time: '00:00', location: '', user_id: userId,
          }))
          const { data: created } = await supabase.from('courses').insert(newCourses).select()
          if (created) {
            created.forEach((c: any) => courseMap.set(c.name, c.id))
          }
        }

        // Parse students from sheet
        const sheetStudents = rows.slice(1)
          .map((r) => {
            const courseName = (r[3] || '').trim()
            return {
              name: (r[0] || '').trim(),
              phone: (r[1] || '').trim(),
              email: (r[2] || '').trim(),
              course_id: courseMap.get(courseName) || '',
              user_id: userId,
            }
          })
          .filter((s) => s.name && s.phone && s.course_id)

        // Get existing students for this user
        const { data: existingStudents } = await supabase.from('students').select('id, name, phone, course_id').eq('user_id', userId)

        // Upsert: add new students that don't exist (match by phone + course_id)
        const existingSet = new Set(
          (existingStudents || []).map((s: any) => `${s.phone}_${s.course_id}`)
        )

        const newStudents = sheetStudents.filter(
          (s) => !existingSet.has(`${s.phone}_${s.course_id}`)
        )

        if (newStudents.length > 0) {
          const { error: insertErr } = await supabase.from('students').upsert(newStudents, {
            onConflict: 'phone,user_id',
            ignoreDuplicates: true,
          })
          if (insertErr) console.error('Insert students error:', insertErr.message)
        }

        // Update last_synced_at
        await supabase.from('sync_settings').update({
          last_synced_at: new Date().toISOString(),
        }).eq('id', settings.id)

        results.push({
          user_id: settings.user_id,
          status: 'success',
          new_students: newStudents.length,
          total_sheet_rows: sheetStudents.length,
        })
      } catch (err) {
        results.push({ user_id: settings.user_id, status: 'error', error: err.message })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
