// ── Avoid-repeats logic ───────────────────────────────────────────────
// Tracks recently used meals and penalises them during plan generation
// so users don't eat the same things every week.

import { supabase } from './supabase'

/**
 * Fetch meals used in the last N days for the current user.
 * Returns a Set of meal names (lowercased).
 */
export async function getRecentlyUsedMeals(userId, days = 14) {
  if (!userId) return new Set()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('meal_history')
    .select('meal_name')
    .eq('user_id', userId)
    .gte('used_on_date', since.toISOString().slice(0, 10))

  if (error || !data) return new Set()
  return new Set(data.map(r => r.meal_name.toLowerCase()))
}

/**
 * Record that a set of meals was used today (called when user saves/finalises a plan).
 */
export async function recordMealsUsed(userId, weeklyPlan) {
  if (!userId || !weeklyPlan) return
  const rows = []
  const today = new Date().toISOString().slice(0, 10)

  Object.values(weeklyPlan).forEach(day => {
    Object.values(day).forEach(meal => {
      if (!meal) return
      rows.push({
        user_id:      userId,
        meal_id:      meal.id || null,
        meal_name:    meal.item_name,
        used_on_date: today,
      })
    })
  })

  if (!rows.length) return
  // Insert in batches to avoid size limits
  for (let i = 0; i < rows.length; i += 25) {
    await supabase.from('meal_history').insert(rows.slice(i, i + 25))
  }
}

/**
 * Filter a meal pool to de-prioritise recently used meals.
 * Recently used meals are moved to the end of the pool (not removed entirely,
 * in case there aren't enough unique meals to fill the plan).
 */
export function applyAvoidRepeats(meals, recentlyUsed) {
  if (!recentlyUsed || recentlyUsed.size === 0) return meals
  const fresh    = meals.filter(m => !recentlyUsed.has(m.item_name.toLowerCase()))
  const repeated = meals.filter(m =>  recentlyUsed.has(m.item_name.toLowerCase()))
  return [...fresh, ...repeated]
}

/**
 * Fetch most-used meals for insights page.
 * Returns array of { meal_name, count } sorted by count desc.
 */
export async function getMostUsedMeals(userId, limit = 10) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('meal_history')
    .select('meal_name')
    .eq('user_id', userId)

  if (error || !data) return []

  // Count occurrences
  const counts = {}
  data.forEach(r => {
    const n = r.meal_name
    counts[n] = (counts[n] || 0) + 1
  })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([meal_name, count]) => ({ meal_name, count }))
}
