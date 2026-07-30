// Supabase Edge Function: daily-suggestion
//
// Once a day (~9:15 PM, each user's own local time — after the "how was
// dinner" nag), asks the AI for one new recipe the user doesn't already have,
// stores it as a pending suggestion, and sends a push notification. The app
// shows it next time the user opens it (see PendingSuggestion component).
//
// Intended cron: every 15 minutes, all week.
//   */15 * * * *
//
// Deploy: supabase functions deploy daily-suggestion
// Requires the same secrets as ai-chef (GROQ_API_KEY) and send-reminders
// (VAPID_*), plus SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (automatic).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

Deno.serve(async (req) => {
  try {
    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@example.com'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: 'VAPID keys not configured' }, 500)
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

    let body: any = {}
    if (req.method === 'POST') { try { body = await req.json() } catch { body = {} } }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id, timezone')
    if (subsErr) throw subsErr

    let userIds = [...new Set((subs || []).map((s: any) => s.user_id))]
    if (body.user_id) userIds = userIds.filter((id) => id === body.user_id)
    if (!userIds.length) return json({ ok: true, suggested: 0, skipped: 0 })

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, diet_prefs')
      .in('id', userIds)
    const profileByUser = new Map((profiles || []).map((p: any) => [p.id, p]))

    const { data: existingSuggestions } = await supabase
      .from('ai_suggestions')
      .select('user_id, created_at')
      .in('user_id', userIds)
    const suggestionByUser = new Map((existingSuggestions || []).map((s: any) => [s.user_id, s]))

    let suggested = 0, skipped = 0, sent = 0
    const stale: string[] = []

    for (const userId of userIds) {
      const sub = (subs || []).find((s: any) => s.user_id === userId)
      const tz = sub?.timezone || 'UTC'

      if (!body.force) {
        if (!isNineFifteenPM(tz)) { skipped++; continue }
        const existing = suggestionByUser.get(userId)
        // Don't pile up suggestions — skip if there's already an unactioned
        // one from within the last 20 hours.
        if (existing && Date.now() - new Date(existing.created_at).getTime() < 20 * 3600 * 1000) {
          skipped++
          continue
        }
      }

      const { data: meals } = await supabase
        .from('meals')
        .select('item_name')
        .eq('user_id', userId)
        .limit(80)
      const dietPrefs: string[] = profileByUser.get(userId)?.diet_prefs?.length
        ? profileByUser.get(userId).diet_prefs
        : ['veg', 'vegan', 'nonveg']

      let suggestion
      try {
        suggestion = await getSuggestionFromAI(SUPABASE_URL, SERVICE_KEY, meals || [], dietPrefs)
      } catch (e) {
        console.error(`AI suggestion failed for user ${userId}:`, e)
        skipped++
        continue
      }
      if (!suggestion) { skipped++; continue }

      await supabase.from('ai_suggestions').upsert({
        user_id: userId,
        meal_json: suggestion,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      suggested++

      const userSubs = (subs || []).filter((s: any) => s.user_id === userId)
      const msg = {
        title: 'A recipe idea for you 💡',
        body: `${suggestion.item_name} — tap to see it, save it, or skip it.`,
        url: '/recipes', tag: 'ai-suggestion',
      }
      for (const s of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(msg),
          )
          sent++
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) stale.push(s.endpoint)
        }
      }
    }

    if (stale.length) await supabase.from('push_subscriptions').delete().in('endpoint', stale)

    return json({ ok: true, suggested, skipped, sent })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// True when it's roughly 9:15 PM (a 15-min window matching the cron cadence)
// in the given IANA time zone — after the dinner/did-you-cook reminder.
function isNineFifteenPM(timezone: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false,
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value
    const hour = parseInt(get('hour') || '0', 10)
    const minute = parseInt(get('minute') || '0', 10)
    return hour === 21 && minute >= 15 && minute < 30
  } catch {
    return false
  }
}

// Calls the ai-chef function (server-to-server, using the service role key as
// the bearer token — it's a valid project JWT) to get one new recipe idea.
async function getSuggestionFromAI(
  supabaseUrl: string, serviceKey: string, meals: { item_name: string }[], dietPrefs: string[],
) {
  const names = meals.map((m) => m.item_name).filter(Boolean)
  const sample = names.slice(0, 60).join(', ') || 'no recipes yet'
  const diets = dietPrefs.length ? dietPrefs.join('/') : 'any'

  const prompt = `You are a meal-planning assistant. Suggest ONE new recipe this
person doesn't already have, based on the style of their existing recipes below.
It should feel like a natural fit for their taste, but be genuinely NEW — not a
near-duplicate of anything already in the list.

Their existing recipes: ${sample}
Diet preference: ${diets}

Respond with JSON ONLY, no markdown, no preamble:
{"item_name":"Recipe Name","category":"Breakfast|Lunch|Dinner|Snack","diet_type":"veg|vegan|nonveg","ingredients":"comma, separated, ingredients","prep_time":25,"calories":350}`

  const res = await fetch(`${supabaseUrl}/functions/v1/ai-chef`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({ prompt, maxTokens: 400, jsonMode: true }),
  })
  if (!res.ok) throw new Error(`ai-chef returned ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)

  const parsed = extractJSON(data.text || '')
  if (!parsed.item_name || !parsed.category) return null

  return {
    item_name: String(parsed.item_name).trim(),
    category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Dinner',
    diet_type: ['veg', 'vegan', 'nonveg'].includes(parsed.diet_type) ? parsed.diet_type : 'veg',
    ingredients: String(parsed.ingredients || '').trim(),
    prep_time: Number.isFinite(parsed.prep_time) ? parsed.prep_time : null,
    calories: Number.isFinite(parsed.calories) ? parsed.calories : null,
  }
}

// Same robust extractor as the client (aiFeatures.js) — strips reasoning
// blocks / markdown fences and pulls the first balanced {...} block.
function extractJSON(raw: string): any {
  if (!raw) throw new Error('Empty AI response')
  let s = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .replace(/```json|```/g, '')
    .trim()
  try { return JSON.parse(s) } catch { /* keep going */ }
  const start = s.indexOf('{')
  if (start === -1) throw new Error('No JSON object in AI response')
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc) { esc = false; continue }
    if (c === '\\') { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return JSON.parse(s.slice(start, i + 1))
    }
  }
  throw new Error('Incomplete JSON in AI response')
}
