// ── Match library meals against ingredients you have on hand ──────────
// Given a list of detected/owned ingredients and the user's meal library,
// rank meals by how completely you can already make them. Fuzzy by design:
// returns near-matches with a "you'll still need X" list, not just exact ones.

import { parseIngredients } from './mealLogic'

// Loose ingredient equality: handles plurals and partial words so "tomato"
// matches "tomatoes", "chicken" matches "chicken breast", etc.
function ingredientMatches(have, need) {
  if (have === need) return true
  if (have.includes(need) || need.includes(have)) return true
  // singular/plural tolerance
  const sing = s => s.replace(/(es|s)$/,'')
  return sing(have) === sing(need)
}

/**
 * @param {string[]} owned   - ingredients the user has (lowercase)
 * @param {object[]} meals   - the user's meal library
 * @param {object} opts      - { dietTypes?: string[], minMatchRatio?: number }
 * @returns ranked array of { meal, have:[], missing:[], ratio }
 */
export function matchMealsToIngredients(owned, meals, opts = {}) {
  const { dietTypes, minMatchRatio = 0.5 } = opts
  const ownedList = (owned || []).map(s => s.trim().toLowerCase()).filter(Boolean)
  if (!ownedList.length || !meals?.length) return []

  const results = []
  for (const meal of meals) {
    if (dietTypes && dietTypes.length && !dietTypes.includes(meal.diet_type)) continue
    const need = parseIngredients(meal.ingredients)
    if (!need.length) continue

    const have = [], missing = []
    for (const ing of need) {
      if (ownedList.some(o => ingredientMatches(o, ing))) have.push(ing)
      else missing.push(ing)
    }
    const ratio = have.length / need.length
    if (ratio >= minMatchRatio) {
      results.push({ meal, have, missing, ratio })
    }
  }

  // Best matches first: highest ratio, then fewest missing items.
  results.sort((a, b) => b.ratio - a.ratio || a.missing.length - b.missing.length)
  return results
}
