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

// Leftovers — a no-cook placeholder like eating-out, for using up a prior meal.
export const LEFTOVERS_ID = '__leftovers__'
export function makeLeftoversMeal(category) {
  return {
    id: LEFTOVERS_ID,
    item_name: 'Leftovers',
    category,
    ingredients: '',
    diet_type: 'veg',
    isLeftovers: true,
  }
}
export function isLeftovers(meal) {
  return !!meal && (meal.isLeftovers === true || meal.id === LEFTOVERS_ID)
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

  const plan = {}
  for (let day = 0; day < 7; day++) plan[day] = {}

  // Track every meal id already placed anywhere in the week, so the same
  // dish never repeats until we've exhausted the available options.
  const usedIds = new Set()

  for (const category of CATEGORIES) {
    const catMeals = grouped[category] || []
    if (!catMeals.length) continue

    // Rank the whole category (score/shuffle), then walk the week assigning
    // the best not-yet-used meal. Only when every meal has been used once do
    // we allow reuse — and we reset so reuse is also spread out, not clumped.
    let ranked = rankMeals(catMeals, budgetMode)
    let available = ranked.filter(m => !usedIds.has(m.id))

    for (let day = 0; day < 7; day++) {
      if (!available.length) {
        // Pool exhausted for this category — allow reuse, reshuffled so the
        // repeats are spread rather than the same dish back-to-back.
        available = shuffleArray(ranked.slice())
      }
      const meal = available.shift()
      if (meal) {
        plan[day][category] = meal
        usedIds.add(meal.id)
      }
    }
  }

  return plan
}

// Rank meals within a category: score by ingredient overlap + favorites,
// then lightly shuffle so plans vary between generations while still
// favouring good matches. Returns the full category, best-first-ish.
function rankMeals(catMeals, budgetMode) {
  const scored = scoreAndSampleMeals(catMeals, catMeals.length, budgetMode)
  // Light shuffle: nudge order randomly but keep higher-scored meals near the
  // front, so each generation differs without becoming fully random.
  return scored
    .map((m, i) => ({ m, k: i + (Math.random() - 0.5) * 3 }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.m)
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5)
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
