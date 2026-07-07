// Supabase Edge Function: send-reminders
// Sends a web-push notification to all stored subscriptions.
// Phase 1: the weekly "time to plan" reminder. Triggered by a scheduled cron
// (see PUSH_SETUP guide) or called manually for testing.
//
// Deploy: supabase functions deploy send-reminders
// Secrets needed (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@email.com)
//   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

Deno.serve(async (req) => {
  try {
    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@example.com'
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 500 })
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

    // Optional: allow a custom message via POST body, else default weekly nudge.
    let payload = { title: 'Time to plan your week 🍽️', body: 'Generate this week\u2019s meals and get your grocery list ready.', url: '/planner', tag: 'weekly-plan' }
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        payload = { ...payload, ...body }
      } catch { /* use default */ }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
    if (error) throw error

    let sent = 0, removed = 0
    const stale: string[] = []

    await Promise.all((subs || []).map(async (s) => {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload))
        sent++
      } catch (err) {
        // 404/410 = subscription expired; mark for cleanup.
        const code = (err as any)?.statusCode
        if (code === 404 || code === 410) stale.push(s.endpoint)
      }
    }))

    if (stale.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', stale)
      removed = stale.length
    }

    return new Response(JSON.stringify({ ok: true, sent, removed }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
