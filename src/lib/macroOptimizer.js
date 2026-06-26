// ── Macro-targeted plan optimizer ─────────────────────────────────────
// Honest, best-effort optimization. Given an existing weekly plan, a meal
// library, and per-day macro targets, it swaps meals (same category, diet-
// allowed) to move the WEEKLY AVERAGE per day toward the targets. It never
// pretends to hit exact numbers — it gets as close as the library allows and
// the caller reports the remaining gap.

import { estimateNutrition } from './nutrition'
import { CATEGORIES, parseIngredients } from './mealLogic'

// Resolve a meal's per-serving macros (stored first, then estimate).
function mealMacros(meal) {
  if (!meal) return { calories: 0, protein_g: 0 }
  if (meal.calories != null) {
    return { calories: Number(meal.calories) || 0, protein_g: Number(meal.protein_g) || 0 }
  }
  const est = estimateNutrition(meal.ingredients, 1)
  return est ? { calories: est.calories || 0, protein_g: est.protein_g || 0 } : { calories: 0, protein_g: 0 }
}

// Sum a whole plan's per-day average for calories + protein.
function planPerDay(plan) {
  let cal = 0, pro = 0
  const days = Object.keys(plan)
  for (const d of days) {
    for (const cat of CATEGORIES) {
      const m = plan[d]?.[cat]
      if (!m) continue
      const mm = mealMacros(m)
      cal += mm.calories
      pro += mm.protein_g
    }
  }
  const n = days.length || 7
  return { calories: cal / n, protein_g: pro / n }
}

// Distance from target as a normalized, weighted error. Calories and protein
// are on very different scales, so normalize each by its target before summing.
function gapScore(perDay, target) {
  let score = 0
  if (target.calories) score += Math.abs(perDay.calories - target.calories) / target.calories
  if (target.protein_g) score += Math.abs(perDay.protein_g - target.protein_g) / target.protein_g
  return score
}

/**
 * @param {object} plan        existing weekly plan (day idx -> {cat: meal})
 * @param {object[]} library   candidate meals
 * @param {object} target      { calories?, protein_g? } per-day goals
 * @param {object} opts        { dietTypes?: string[] }
 * @returns { plan, perDay, target, improved, before }
 */
export function optimizeForMacros(plan, library, target, opts = {}) {
  const { dietTypes } = opts
  if (!plan || !library?.length || (!target.calories && !target.protein_g)) {
    return { plan, perDay: planPerDay(plan || {}), target, improved: false, before: planPerDay(plan || {}) }
  }

  // Deep clone so we never mutate the live plan.
  const next = JSON.parse(JSON.stringify(plan))
  const before = planPerDay(next)

  // Candidate pool by category, diet-filtered.
  const byCat = {}
  for (const cat of CATEGORIES) {
    byCat[cat] = library.filter(m =>
      m.category === cat &&
      parseIngredients(m.ingredients).length > 0 &&
      (!dietTypes || !dietTypes.length || dietTypes.includes(m.diet_type))
    )
  }

  const days = Object.keys(next)
  let currentScore = gapScore(planPerDay(next), target)

  // Greedy passes: for each slot, try the best replacement that lowers the gap.
  // A few passes let earlier swaps inform later ones without running forever.
  const MAX_PASSES = 3
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let changedThisPass = false
    for (const d of days) {
      for (const cat of CATEGORIES) {
        const slotMeal = next[d]?.[cat]
        if (!slotMeal) continue                 // don't fill empty slots, only swap existing
        if (slotMeal.id === '__eating_out__') continue
        const candidates = byCat[cat]
        if (!candidates || candidates.length < 2) continue

        let bestMeal = slotMeal
        let bestScore = currentScore
        for (const cand of candidates) {
          if (cand.id === slotMeal.id) continue
          const prev = next[d][cat]
          next[d][cat] = cand
          const s = gapScore(planPerDay(next), target)
          next[d][cat] = prev               // revert trial
          if (s < bestScore - 1e-6) { bestScore = s; bestMeal = cand }
        }
        if (bestMeal.id !== slotMeal.id) {
          next[d][cat] = bestMeal
          currentScore = bestScore
          changedThisPass = true
        }
      }
    }
    if (!changedThisPass) break
  }

  const perDay = planPerDay(next)
  return {
    plan: next,
    perDay,
    target,
    before,
    improved: gapScore(perDay, target) < gapScore(before, target) - 1e-6,
  }
}
