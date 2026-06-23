// ── Unified meal facts resolver ──────────────────────────────────────
// One place that decides, for any meal, what time / cost / calories to show.
// Rule everywhere: use the stored value if the user (or AI) provided one,
// otherwise fall back to the live estimate. Keeps every card, modal, and
// page consistent.

import { estimateNutrition } from './nutrition'
import { estimateCost } from './budget'

export function formatPrepTime(minutes) {
  if (minutes == null || minutes === '' || isNaN(minutes)) return null
  const m = Math.round(Number(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`
}

/**
 * Resolve display facts for a meal.
 * @returns { calories, cost, prepTime, caloriesEstimated, costEstimated }
 *          values may be null when neither stored nor estimable.
 */
export function getMealFacts(meal, servings = 1) {
  if (!meal) return { calories: null, cost: null, prepTime: null }

  // Calories — stored wins, else estimate from ingredients
  let calories = null, caloriesEstimated = false
  if (meal.calories != null) {
    calories = meal.calories
  } else {
    const est = estimateNutrition(meal.ingredients, 1)
    if (est?.calories != null) { calories = est.calories; caloriesEstimated = true }
  }

  // Cost per serving — stored wins, else estimate
  let cost = null, costEstimated = false
  if (meal.cost_per_serving != null) {
    cost = meal.cost_per_serving
  } else {
    const est = estimateCost(meal.ingredients)
    if (est != null) { cost = est; costEstimated = true }
  }

  // Prep time — only ever stored (can't be estimated from ingredients)
  const prepTime = meal.prep_time != null ? meal.prep_time : null

  return { calories, cost, prepTime, caloriesEstimated, costEstimated }
}

/**
 * Total cooking time across a weekly plan.
 * @returns { totalMinutes, mealsWithTime, totalMeals }
 *          totalMinutes only sums meals that actually have a stored time,
 *          since time can't be estimated. mealsWithTime tells the UI how
 *          complete the figure is (e.g. "12 of 28 meals timed").
 */
export function weeklyTimeTotal(weeklyPlan) {
  if (!weeklyPlan) return { totalMinutes: 0, mealsWithTime: 0, totalMeals: 0 }
  let totalMinutes = 0, mealsWithTime = 0, totalMeals = 0
  Object.values(weeklyPlan).forEach(day => {
    Object.values(day).forEach(meal => {
      if (!meal) return
      totalMeals++
      if (meal.prep_time != null) {
        totalMinutes += Number(meal.prep_time) || 0
        mealsWithTime++
      }
    })
  })
  return { totalMinutes, mealsWithTime, totalMeals }
}
