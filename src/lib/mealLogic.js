// ─────────────────────────────────────────────────────────
// Meal Planning Algorithm
// Ported from Python meal_logic.py — optimizes for shared
// ingredients to minimize grocery list complexity
// ─────────────────────────────────────────────────────────

import { estimateCost } from './budget'

export const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
export const CATEGORIES = ['Breakfast','Lunch','Dinner','Snack']

export const CATEGORY_ICONS = {
  Breakfast: '🍳',
  Lunch:     '🥗',
  Dinner:    '🍝',
  Snack:     '🍎',
}

export const DIET_LABELS = {
  veg:    { label: 'Veg',     color: 'bg-sage-100 text-sage-700 border-sage-200' },
  vegan:  { label: 'Vegan',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  nonveg: { label: 'Non-Veg', color: 'bg-clay-100 text-clay-700 border-clay-200' },
}

// Sentinel "meal" representing a planned night out / takeout — no cooking,
// no ingredients (so it's excluded from grocery, nutrition, time, and cost).
export const EATING_OUT_ID = '__eating_out__'
export function makeEatingOutMeal(category) {
  return {
    id: EATING_OUT_ID,
    item_name: 'Eating out',
    category,
    ingredients: '',
    diet_type: 'nonveg',
    isEatingOut: true,
  }
}
export function isEatingOut(meal) {
  return !!meal && (meal.isEatingOut === true || meal.id === EATING_OUT_ID)
}

// Parse comma-separated ingredient string into a cleaned array
export function parseIngredients(ingredientString) {
  if (!ingredientString) return []
  return ingredientString
    .split(',')
    .map(i => i.trim().toLowerCase())
    .filter(Boolean)
}

// Score meals by ingredient overlap (higher = more shared ingredients)
function scoreAndSampleMeals(meals, total = 7, budgetMode = false) {
  if (!meals || meals.length === 0) return []

  // Count ingredient frequency across all meals in category
  const counter = {}
  for (const meal of meals) {
    const ingredients = parseIngredients(meal.ingredients)
    for (const ing of ingredients) {
      counter[ing] = (counter[ing] || 0) + 1
    }
  }

  // Score each meal by ingredient overlap (reuse = less waste, cheaper shop).
  // Favorited meals get a meaningful boost so the things you love show up more.
  const scored = meals.map(meal => {
    const overlap = parseIngredients(meal.ingredients).reduce((sum, ing) => sum + (counter[ing] || 0), 0)
    const favBoost = meal.is_favorite ? 8 : 0
    return {
      ...meal,
      _ingredients: parseIngredients(meal.ingredients),
      _score: overlap + favBoost,
    }
  })

  if (budgetMode) {
    // Bias toward cheaper meals: lower cost-per-serving sorts first, with the
    // overlap score as a tiebreaker. Stored cost wins; estimate as fallback.
    const costOf = (m) => {
      if (m.cost_per_serving != null) return Number(m.cost_per_serving)
      const est = estimateCost(m.ingredients)
      return est != null ? est : 999  // unknown cost sinks to the bottom
    }
    scored.sort((a, b) => {
      const ca = costOf(a), cb = costOf(b)
      if (ca !== cb) return ca - cb
      return b._score - a._score
    })
    // Sample from a slightly larger cheap pool so plans still vary day to day.
    if (scored.length <= total) return scored
    const pool = scored.slice(0, Math.max(12, total))
    return shuffleAndSample(pool, total)
  }

  // Default: sort by ingredient-overlap score descending
  scored.sort((a, b) => b._score - a._score)
  if (scored.length <= total) return scored
  const pool = scored.slice(0, Math.max(15, total))
  return shuffleAndSample(pool, total)
}

function shuffleAndSample(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// Build a full 7-day plan
export function buildWeeklyPlan(meals, opts = {}) {
  const { budgetMode = false } = opts
  // Group by category
  const grouped = {}
  for (const meal of meals) {
    const cat = meal.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(meal)
  }

  // Build plan: { 0: { Breakfast: meal, Lunch: meal, ... }, 1: {...}, ... }
  const plan = {}
  for (let day = 0; day < 7; day++) {
    plan[day] = {}
  }

  for (const category of CATEGORIES) {
    const selected = scoreAndSampleMeals(grouped[category] || [], 7, budgetMode)
    for (let day = 0; day < 7; day++) {
      if (selected[day]) {
        plan[day][category] = selected[day]
      }
    }
  }

  return plan
}

// Build grocery list from weekly plan
// Returns: { ingredient: [list of meal names using it] }
export function buildGroceryList(weeklyPlan) {
  const mapping = {}

  for (const [dayIdx, dayMeals] of Object.entries(weeklyPlan)) {
    for (const [category, meal] of Object.entries(dayMeals)) {
      const ingredients = parseIngredients(meal.ingredients)
      for (const ing of ingredients) {
        if (!mapping[ing]) mapping[ing] = []
        mapping[ing].push(`${DAYS[dayIdx]} ${category}: ${meal.item_name}`)
      }
    }
  }

  return mapping
}

// Serialize plan for Supabase storage (sets → arrays isn't needed in JS,
// but we clean _score and _ingredients fields)
export function serializePlan(weeklyPlan) {
  const clean = {}
  for (const [day, meals] of Object.entries(weeklyPlan)) {
    clean[day] = {}
    for (const [category, meal] of Object.entries(meals)) {
      const { _score, _ingredients, ...rest } = meal
      clean[day][category] = rest
    }
  }
  return clean
}

// Deserialize plan loaded from Supabase
export function deserializePlan(planJson) {
  if (typeof planJson === 'string') return JSON.parse(planJson)
  return planJson
}
