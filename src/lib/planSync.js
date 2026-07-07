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
    await supabase.from('active_plans').upsert({
      user_id: user.id,
      plan_json: data.plan ?? null,
      prep_json: data.prep ?? {},
      servings: data.servings ?? 2,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch { /* non-critical */ }
}

// Call on any plan/prep/servings change. Coalesces rapid changes into one write.
export function syncActivePlan(partial) {
  pending = { ...(pending || {}), ...partial }
  if (timer) clearTimeout(timer)
  timer = setTimeout(flush, 1500)
}

// Clear the server copy (e.g. on clearPlan).
export async function clearActivePlan() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('active_plans').delete().eq('user_id', user.id)
  } catch { /* non-critical */ }
}
