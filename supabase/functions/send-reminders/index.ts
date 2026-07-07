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

    // Preset messages by reminder type. A cron (or manual call) passes { type }.
    // A fully custom { title, body, url } still overrides everything.
    const PRESETS = {
      'weekly-plan': {
        title: 'Time to plan your week 🍽️',
        body: 'Generate this week\u2019s meals and get your grocery list ready.',
        url: '/planner', tag: 'weekly-plan',
      },
      'cook-dinner': {
        title: 'Dinner time 👩‍🍳',
        body: 'Open your plan to see what\u2019s on the menu tonight.',
        url: '/planner', tag: 'cook-dinner',
      },
      'grocery-run': {
        title: 'Grocery run 🛒',
        body: 'Your shopping list is ready whenever you are.',
        url: '/grocery', tag: 'grocery-run',
      },
      'weekly-recap': {
        title: 'Your week in food 📊',
        body: 'See how you did — meals cooked, money saved, and more.',
        url: '/planner', tag: 'weekly-recap',
      },
    }

    let reqBody: any = {}
    if (req.method === 'POST') {
      try { reqBody = await req.json() } catch { reqBody = {} }
    }

    let payload = PRESETS['weekly-plan']
    if (reqBody.type && PRESETS[reqBody.type]) payload = PRESETS[reqBody.type]
    payload = { ...payload, ...reqBody }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const reqType = reqBody.type || 'weekly-plan'
    const PERSONALIZED = new Set(['cook-dinner', 'did-you-cook', 'weekly-recap'])
    const isPersonal = PERSONALIZED.has(reqType)

    const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

    // Build the message for a given user's active plan. Returns null to SKIP
    // this user (e.g. "did-you-cook" when they already cooked, or no plan).
    function personalize(type: string, plan: any, prep: any, timezone?: string): { title: string; body: string; url: string; tag: string } | null {
      const todayIdx = serverDayIndex(timezone)   // 0=Mon..6=Sun in user's zone
      const day = plan?.[todayIdx] || plan?.[String(todayIdx)]
      if (type === 'cook-dinner') {
        const dinner = day?.Dinner
        if (!dinner || !dinner.item_name) return null   // nothing planned → skip
        return { title: 'Dinner time 👩‍🍳', body: `Tonight: ${dinner.item_name}. Tap to see the recipe.`, url: '/planner', tag: 'cook-dinner' }
      }
      if (type === 'did-you-cook') {
        const dinner = day?.Dinner
        if (!dinner || !dinner.item_name) return null
        const doneKey = `${todayIdx}-Dinner`
        if (prep && prep[doneKey]) return null           // already cooked → don't nag
        return { title: 'How was dinner? 🍽️', body: `Did you get to make ${dinner.item_name}? Tap to mark it done.`, url: '/planner', tag: 'did-you-cook' }
      }
      if (type === 'weekly-recap') {
        let planned = 0, cooked = 0
        for (let d = 0; d < 7; d++) {
          const dd = plan?.[d] || plan?.[String(d)]
          if (!dd) continue
          for (const c of CATEGORIES) {
            if (dd[c] && dd[c].item_name) {
              planned++
              if (prep && prep[`${d}-${c}`]) cooked++
            }
          }
        }
        if (planned === 0) return null
        return { title: 'Your week in food 📊', body: `You cooked ${cooked} of ${planned} planned meals this week. Nice work — ready for next week?`, url: '/planner', tag: 'weekly-recap' }
      }
      return null
    }

    let sent = 0, removed = 0
    const stale: string[] = []

    if (isPersonal) {
      // Join subscriptions with each user's active plan and send per-user.
      const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth, user_id, timezone')
      if (error) throw error

      const userIds = [...new Set((subs || []).map((s) => s.user_id))]
      const { data: plans } = await supabase
        .from('active_plans')
        .select('user_id, plan_json, prep_json')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      const planByUser = new Map((plans || []).map((p) => [p.user_id, p]))

      await Promise.all((subs || []).map(async (s) => {
        const row = planByUser.get(s.user_id)
        const msg = personalize(reqType, row?.plan_json, row?.prep_json, s.timezone)
        if (!msg) return   // skip this user
        const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
        try {
          await webpush.sendNotification(subscription, JSON.stringify(msg))
          sent++
        } catch (err) {
          const code = (err as any)?.statusCode
          if (code === 404 || code === 410) stale.push(s.endpoint)
        }
      }))
    } else {
      // Broadcast the same message to everyone (weekly-plan, grocery-run).
      const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
      if (error) throw error

      await Promise.all((subs || []).map(async (s) => {
        const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
        try {
          await webpush.sendNotification(subscription, JSON.stringify(payload))
          sent++
        } catch (err) {
          const code = (err as any)?.statusCode
          if (code === 404 || code === 410) stale.push(s.endpoint)
        }
      }))
    }

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

// Day index (Monday=0 … Sunday=6) computed in a given IANA timezone.
function serverDayIndex(timezone?: string): number {
  try {
    const tz = timezone || 'UTC'
    // en-US weekday in the target zone → map to Mon=0..Sun=6.
    const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(new Date())
    const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
    return map[wd] ?? ((new Date().getUTCDay() + 6) % 7)
  } catch {
    return (new Date().getUTCDay() + 6) % 7
  }
}
