// Supabase Edge Function: auto-generate-plan
//
// Safety net for Sunday planning: if a user hasn't generated their own plan
// for the upcoming week by 9:30 PM Sunday (their local time), this generates
// one for them from their existing recipe library and sends a push notice.
//
// Intended cron: every 15 minutes, all week (the function itself checks
// whether it's currently ~9:30 PM Sunday in each user's own time zone, and
// only acts on users who match — so one cron schedule covers every time zone).
//   */15 * * * *   (every 15 min)
//
// Deploy: supabase functions deploy auto-generate-plan
// Uses the same VAPID secrets as send-reminders.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

Deno.serve(async (req) => {
  try {
    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@example.com'
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return json({ error: 'VAPID keys not configured' }, 500)
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

    // Manual testing: POST { force: true, user_id: '...' } to run for one user
    // regardless of the current time — bypasses the Sunday-9:30 window check.
    let body: any = {}
    if (req.method === 'POST') { try { body = await req.json() } catch { body = {} } }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id, timezone')
    if (subsErr) throw subsErr

    let userIds = [...new Set((subs || []).map((s: any) => s.user_id))]
    if (body.user_id) userIds = userIds.filter((id) => id === body.user_id)
    if (!userIds.length) return json({ ok: true, generated: 0, skipped: 0, note: 'no subscribers' })

    const { data: plans } = await supabase
      .from('active_plans')
      .select('user_id, updated_at, servings')
      .in('user_id', userIds)
    const planByUser = new Map((plans || []).map((p: any) => [p.user_id, p]))

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, diet_prefs, budget_mode, default_servings')
      .in('id', userIds)
    const profileByUser = new Map((profiles || []).map((p: any) => [p.id, p]))

    let generated = 0, skipped = 0, sent = 0
    const stale: string[] = []

    for (const userId of userIds) {
      const sub = (subs || []).find((s: any) => s.user_id === userId)
      const tz = sub?.timezone || 'UTC'

      if (!body.force) {
        if (!isSundayNineThirty(tz)) { skipped++; continue }
        const plan = planByUser.get(userId)
        if (plan?.updated_at && new Date(plan.updated_at).getTime() > lastSaturdayMidnight(tz).getTime()) {
          // They already generated/edited a plan themselves this weekend — skip.
          skipped++
          continue
        }
      }

      const profile = profileByUser.get(userId)
      const dietPrefs: string[] = (profile?.diet_prefs?.length ? profile.diet_prefs : ['veg', 'vegan', 'nonveg'])
      const servings = profile?.default_servings || planByUser.get(userId)?.servings || 2

      const { data: meals } = await supabase
        .from('meals')
        .select('id, item_name, category, diet_type, calories, cost_per_serving')
        .eq('user_id', userId)
        .in('category', CATEGORIES)
        .in('diet_type', dietPrefs)

      if (!meals || !meals.length) { skipped++; continue }

      const plan = buildWeeklyPlan(meals, { budgetMode: !!profile?.budget_mode })
      const hasAnyMeal = Object.values(plan).some((day: any) => Object.keys(day).length > 0)
      if (!hasAnyMeal) { skipped++; continue }

      await supabase.from('active_plans').upsert({
        user_id: userId,
        plan_json: plan,
        prep_json: {},
        grocery_json: null,
        servings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      generated++

      // Notify — one push per subscription for this user.
      const userSubs = (subs || []).filter((s: any) => s.user_id === userId)
      const dayCount = Object.values(plan).filter((d: any) => Object.keys(d).length > 0).length
      const msg = {
        title: 'Next week is planned ✅',
        body: `You hadn't generated a plan, so we made one from your recipes — ${dayCount} days ready. Tap to see it.`,
        url: '/planner', tag: 'auto-plan',
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

    return json({ ok: true, generated, skipped, sent })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// True when it's Sunday and roughly 9:30 PM (within a 15-minute window that
// matches the cron cadence) in the given IANA time zone.
function isSundayNineThirty(timezone: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false,
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value
    const weekday = get('weekday')
    const hour = parseInt(get('hour') || '0', 10)
    const minute = parseInt(get('minute') || '0', 10)
    return weekday === 'Sun' && hour === 21 && minute >= 30 && minute < 45
  } catch {
    return false
  }
}

// Midnight of the most recent Saturday, in the given time zone (as a Date).
function lastSaturdayMidnight(timezone: string): Date {
  try {
    const now = new Date()
    const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(now)
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    const daysSinceSat = ((map[wd] ?? 0) - 6 + 7) % 7
    const d = new Date(now.getTime() - daysSinceSat * 86400000)
    d.setHours(0, 0, 0, 0)
    return d
  } catch {
    return new Date(0)
  }
}

// ── Ported from src/lib/mealLogic.js — keep in sync with the client version ──
function rankMeals(meals: any[], budgetMode: boolean) {
  const scored = meals.map((m) => ({ ...m, _score: Math.random() + (budgetMode && m.cost_per_serving ? -m.cost_per_serving * 0.05 : 0) }))
  return scored.sort((a, b) => b._score - a._score)
}
function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function buildWeeklyPlan(meals: any[], opts: { budgetMode?: boolean } = {}) {
  const { budgetMode = false } = opts
  const grouped: Record<string, any[]> = {}
  for (const meal of meals) {
    const cat = meal.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(meal)
  }
  const plan: Record<number, any> = {}
  for (let day = 0; day < 7; day++) plan[day] = {}
  const usedIds = new Set()
  for (const category of CATEGORIES) {
    const catMeals = grouped[category] || []
    if (!catMeals.length) continue
    let ranked = rankMeals(catMeals, budgetMode)
    let available = ranked.filter((m) => !usedIds.has(m.id))
    for (let day = 0; day < 7; day++) {
      if (!available.length) available = shuffleArray(ranked.slice())
      const meal = available.shift()
      if (meal) {
        plan[day][category] = meal
        usedIds.add(meal.id)
      }
    }
  }
  return plan
}
