import { supabase } from './supabase'

// Debounced sync of the active plan + prep to the server (active_plans table),
// so reminder functions can personalize and plans survive across devices.
// Fire-and-forget: failures are non-critical (localStorage remains the source
// of truth on-device).

let timer = null
let pending = null

async function flush() {
  const data = pending
  pending = null
  if (!data) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Only write the fields that were actually provided, so a grocery-only
    // update never clobbers the plan (and vice-versa).
    const row = { user_id: user.id, updated_at: new Date().toISOString() }
    if ('plan' in data)     row.plan_json = data.plan ?? null
    if ('prep' in data)     row.prep_json = data.prep ?? {}
    if ('servings' in data) row.servings = data.servings ?? 2
    if ('grocery' in data)  row.grocery_json = data.grocery ?? null
    await supabase.from('active_plans').upsert(row, { onConflict: 'user_id' })
  } catch { /* non-critical */ }
}

// Call on any plan/prep/servings/grocery change. Coalesces rapid changes.
export function syncActivePlan(partial) {
  pending = { ...(pending || {}), ...partial }
  if (timer) clearTimeout(timer)
  timer = setTimeout(flush, 1500)
}

// Fetch the server copy of the active plan (for cross-device hydration on load).
// Returns { plan, prep, servings, grocery, updatedAt } or null.
export async function fetchActivePlan() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('active_plans')
      .select('plan_json, prep_json, servings, grocery_json, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error || !data) return null
    return {
      plan: data.plan_json ?? null,
      prep: data.prep_json ?? {},
      servings: data.servings ?? 2,
      grocery: data.grocery_json ?? null,
      updatedAt: data.updated_at ?? null,
    }
  } catch {
    return null
  }
}

// Clear the server copy (e.g. on clearPlan).
export async function clearActivePlan() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('active_plans').delete().eq('user_id', user.id)
  } catch { /* non-critical */ }
}
