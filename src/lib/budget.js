// ── Budget estimation library ─────────────────────────────────────────
// Rough cost-per-serving estimates in USD based on average US grocery prices.
// These are estimates only — real costs vary by location and store.

const INGREDIENT_COSTS = {
  // Proteins (cost per typical serving)
  'chicken':      1.50, 'beef':      2.50, 'salmon':   3.50,
  'tuna':         0.80, 'shrimp':    2.80, 'eggs':     0.25,
  'egg':          0.25, 'tofu':      0.60, 'turkey':   1.20,
  // Dairy
  'milk':         0.25, 'cheese':    0.50, 'yogurt':   0.70,
  'butter':       0.20, 'cream':     0.40, 'cream cheese': 0.45,
  // Grains
  'rice':         0.15, 'pasta':     0.30, 'bread':    0.20,
  'oats':         0.20, 'flour':     0.10, 'quinoa':   0.60,
  'tortilla':     0.25, 'bagel':     0.50,
  // Legumes
  'beans':        0.30, 'chickpeas': 0.30, 'lentils':  0.20,
  // Vegetables
  'broccoli':     0.50, 'spinach':   0.40, 'tomato':   0.35,
  'onion':        0.20, 'garlic':    0.10, 'bell pepper': 0.60,
  'avocado':      0.80, 'mushroom':  0.60, 'carrot':   0.20,
  'zucchini':     0.40, 'cucumber':  0.40, 'lettuce':  0.40,
  'potato':       0.25, 'sweet potato': 0.50,
  // Fruits
  'banana':       0.20, 'apple':     0.40, 'berries':  0.90,
  'mango':        0.80, 'lemon':     0.20, 'lime':     0.20,
  // Pantry / fats
  'olive oil':    0.20, 'peanut butter': 0.25, 'almond butter': 0.50,
  'honey':        0.30, 'coconut milk': 0.50, 'almonds': 0.60,
  'nuts':         0.55, 'chocolate': 0.40, 'soy sauce': 0.10,
  'hummus':       0.40, 'salsa':     0.20,
  // Spices / seasonings (negligible cost)
  'salt':         0.02, 'pepper':    0.02, 'cumin':    0.05,
  'turmeric':     0.05, 'paprika':   0.05, 'cinnamon': 0.05,
  'oregano':      0.05, 'basil':     0.10, 'thyme':    0.05,
}

/**
 * Estimate cost per serving for a meal from its ingredients.
 * Returns a number (USD) or null if no match found.
 */
export function estimateCost(ingredientsStr) {
  if (!ingredientsStr) return null
  const ingredients = ingredientsStr.split(',').map(i => i.trim().toLowerCase())
  let total = 0
  let matched = 0

  for (const ing of ingredients) {
    let key = Object.keys(INGREDIENT_COSTS).find(k => ing === k)
    if (!key) key = Object.keys(INGREDIENT_COSTS).find(k => ing.includes(k) || k.includes(ing))
    if (!key) continue
    total += INGREDIENT_COSTS[key]
    matched++
  }

  if (matched === 0) return null
  return Math.round(total * 100) / 100
}

/**
 * Tag a meal as budget/medium/premium based on estimated cost.
 */
export function getBudgetTag(costPerServing) {
  if (costPerServing == null) return 'medium'
  if (costPerServing < 2.50) return 'budget'
  if (costPerServing < 5.00) return 'medium'
  return 'premium'
}

export const BUDGET_TAG_STYLES = {
  budget:  { label: 'Budget',  emoji: '💚', color: '#1F9E62', bg: 'rgba(31,158,98,0.1)'  },
  medium:  { label: 'Mid',     emoji: '💛', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  premium: { label: 'Premium', emoji: '💎', color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
}

/**
 * Calculate weekly grocery cost from a plan.
 * Returns { total, perDay, perMeal, breakdown } all in USD.
 */
export function weeklyBudgetTotal(weeklyPlan, servings = 1) {
  if (!weeklyPlan) return { total: 0, perDay: 0, perMeal: 0 }
  let total = 0
  let mealCount = 0

  Object.values(weeklyPlan).forEach(day => {
    Object.values(day).forEach(meal => {
      if (!meal) return
      mealCount++
      const cost = meal.cost_per_serving != null
        ? meal.cost_per_serving
        : (estimateCost(meal.ingredients) || 3.00) // $3 default if unknown
      total += cost * servings
    })
  })

  return {
    total:    Math.round(total * 100) / 100,
    perDay:   Math.round((total / 7) * 100) / 100,
    perMeal:  mealCount > 0 ? Math.round((total / mealCount) * 100) / 100 : 0,
    mealCount,
  }
}

/**
 * Given a weekly budget target, suggest which budget tier to filter by.
 */
export function budgetToTier(weeklyBudget, servings = 1, mealsPerWeek = 28) {
  if (!weeklyBudget) return null
  const perMeal = weeklyBudget / mealsPerWeek / servings
  if (perMeal < 2.50) return 'budget'
  if (perMeal < 5.00) return 'medium'
  return 'premium'
}

export function formatCost(n) {
  if (n == null) return '—'
  return `$${n.toFixed(2)}`
}
