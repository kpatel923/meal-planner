// ── Nutrition estimation library ─────────────────────────────────────
// Used when user hasn't manually entered nutrition data.
// Estimates are per-serving, based on common ingredient data.
// All values approximate — for guidance only, not medical advice.

const INGREDIENT_NUTRITION = {
  // Proteins
  'chicken':      { cal: 165, pro: 31, carb: 0,   fat: 3.6,  fiber: 0   },
  'beef':         { cal: 250, pro: 26, carb: 0,   fat: 15,   fiber: 0   },
  'salmon':       { cal: 208, pro: 20, carb: 0,   fat: 13,   fiber: 0   },
  'tuna':         { cal: 130, pro: 29, carb: 0,   fat: 1,    fiber: 0   },
  'shrimp':       { cal: 99,  pro: 24, carb: 0.2, fat: 0.3,  fiber: 0   },
  'eggs':         { cal: 78,  pro: 6,  carb: 0.6, fat: 5,    fiber: 0   },
  'egg':          { cal: 78,  pro: 6,  carb: 0.6, fat: 5,    fiber: 0   },
  'tofu':         { cal: 76,  pro: 8,  carb: 2,   fat: 4,    fiber: 0.3 },
  'turkey':       { cal: 135, pro: 30, carb: 0,   fat: 1,    fiber: 0   },
  // Dairy
  'milk':         { cal: 61,  pro: 3,  carb: 5,   fat: 3.3,  fiber: 0   },
  'cheese':       { cal: 113, pro: 7,  carb: 0.4, fat: 9,    fiber: 0   },
  'yogurt':       { cal: 59,  pro: 10, carb: 3.6, fat: 0.4,  fiber: 0   },
  'butter':       { cal: 102, pro: 0.1,carb: 0,   fat: 11.5, fiber: 0   },
  'cream':        { cal: 205, pro: 1.7,carb: 3.7, fat: 20,   fiber: 0   },
  // Grains & starches
  'rice':         { cal: 206, pro: 4.3,carb: 45,  fat: 0.4,  fiber: 0.6 },
  'pasta':        { cal: 220, pro: 8,  carb: 43,  fat: 1.3,  fiber: 2.5 },
  'bread':        { cal: 79,  pro: 2.7,carb: 15,  fat: 1,    fiber: 0.6 },
  'oats':         { cal: 307, pro: 11, carb: 55,  fat: 5,    fiber: 8   },
  'flour':        { cal: 364, pro: 10, carb: 76,  fat: 1,    fiber: 2.7 },
  'quinoa':       { cal: 222, pro: 8,  carb: 39,  fat: 3.6,  fiber: 5   },
  'potato':       { cal: 77,  pro: 2,  carb: 17,  fat: 0.1,  fiber: 2.2 },
  'sweet potato': { cal: 86,  pro: 1.6,carb: 20,  fat: 0.1,  fiber: 3   },
  'tortilla':     { cal: 146, pro: 3.8,carb: 25,  fat: 3.5,  fiber: 1.5 },
  // Legumes
  'beans':        { cal: 127, pro: 8.7,carb: 23,  fat: 0.5,  fiber: 6.4 },
  'chickpeas':    { cal: 164, pro: 8.9,carb: 27,  fat: 2.6,  fiber: 7.6 },
  'lentils':      { cal: 116, pro: 9,  carb: 20,  fat: 0.4,  fiber: 7.9 },
  // Vegetables
  'broccoli':     { cal: 55,  pro: 3.7,carb: 11,  fat: 0.6,  fiber: 5.1 },
  'spinach':      { cal: 23,  pro: 2.9,carb: 3.6, fat: 0.4,  fiber: 2.2 },
  'tomato':       { cal: 35,  pro: 1.7,carb: 7.6, fat: 0.4,  fiber: 2.4 },
  'onion':        { cal: 44,  pro: 1.2,carb: 10,  fat: 0.1,  fiber: 1.8 },
  'garlic':       { cal: 149, pro: 6.4,carb: 33,  fat: 0.5,  fiber: 2.1 },
  'bell pepper':  { cal: 31,  pro: 1,  carb: 6,   fat: 0.3,  fiber: 2.1 },
  'avocado':      { cal: 160, pro: 2,  carb: 9,   fat: 15,   fiber: 7   },
  'mushroom':     { cal: 22,  pro: 3.1,carb: 3.3, fat: 0.3,  fiber: 1   },
  'carrot':       { cal: 41,  pro: 0.9,carb: 10,  fat: 0.2,  fiber: 2.8 },
  'zucchini':     { cal: 17,  pro: 1.2,carb: 3.1, fat: 0.3,  fiber: 1   },
  'cucumber':     { cal: 15,  pro: 0.7,carb: 3.6, fat: 0.1,  fiber: 0.5 },
  // Fruits
  'banana':       { cal: 89,  pro: 1.1,carb: 23,  fat: 0.3,  fiber: 2.6 },
  'apple':        { cal: 52,  pro: 0.3,carb: 14,  fat: 0.2,  fiber: 2.4 },
  'berries':      { cal: 57,  pro: 0.7,carb: 14,  fat: 0.3,  fiber: 2   },
  'mango':        { cal: 60,  pro: 0.8,carb: 15,  fat: 0.4,  fiber: 1.6 },
  'lemon':        { cal: 29,  pro: 1.1,carb: 9,   fat: 0.3,  fiber: 2.8 },
  // Fats & oils
  'olive oil':    { cal: 884, pro: 0,  carb: 0,   fat: 100,  fiber: 0   },
  'peanut butter':{ cal: 588, pro: 25, carb: 20,  fat: 50,   fiber: 6   },
  'almond butter':{ cal: 614, pro: 21, carb: 19,  fat: 56,   fiber: 10  },
  'coconut milk': { cal: 197, pro: 2,  carb: 6,   fat: 21,   fiber: 0   },
  'almonds':      { cal: 579, pro: 21, carb: 22,  fat: 50,   fiber: 12.5},
  'nuts':         { cal: 607, pro: 15, carb: 21,  fat: 54,   fiber: 7   },
  // Other
  'honey':        { cal: 304, pro: 0.3,carb: 82,  fat: 0,    fiber: 0.2 },
  'sugar':        { cal: 387, pro: 0,  carb: 100, fat: 0,    fiber: 0   },
  'chocolate':    { cal: 546, pro: 5,  carb: 60,  fat: 31,   fiber: 7   },
  'soy sauce':    { cal: 53,  pro: 8,  carb: 5,   fat: 0.1,  fiber: 0.8 },
}

// Weight estimates for "1 serving" of common ingredients (grams)
const SERVING_WEIGHTS = {
  'chicken': 150, 'beef': 120, 'salmon': 150, 'tuna': 100, 'shrimp': 120,
  'eggs': 60, 'egg': 60, 'tofu': 140, 'turkey': 100,
  'milk': 240, 'cheese': 30, 'yogurt': 170, 'butter': 14, 'cream': 60,
  'rice': 185, 'pasta': 140, 'bread': 30, 'oats': 80, 'flour': 30,
  'quinoa': 185, 'potato': 150, 'sweet potato': 130, 'tortilla': 45,
  'beans': 130, 'chickpeas': 130, 'lentils': 120,
  'broccoli': 90, 'spinach': 90, 'tomato': 150, 'onion': 100,
  'garlic': 10, 'bell pepper': 120, 'avocado': 100, 'mushroom': 100,
  'carrot': 80, 'zucchini': 120, 'cucumber': 120,
  'banana': 120, 'apple': 150, 'berries': 140, 'mango': 165, 'lemon': 30,
  'olive oil': 14, 'peanut butter': 32, 'almond butter': 32,
  'coconut milk': 120, 'almonds': 28, 'nuts': 28,
  'honey': 21, 'chocolate': 28, 'soy sauce': 16,
}

const DEFAULT_WEIGHT = 100 // grams for unknown ingredients

/**
 * Estimate nutrition for a meal from its ingredients string.
 * Returns per-serving values assuming the servings count given.
 */
export function estimateNutrition(ingredientsStr, servings = 1) {
  if (!ingredientsStr) return null

  const ingredients = ingredientsStr.split(',').map(i => i.trim().toLowerCase())

  let totals = { cal: 0, pro: 0, carb: 0, fat: 0, fiber: 0 }
  let matched = 0

  for (const ing of ingredients) {
    // Try exact match first, then partial
    let key = Object.keys(INGREDIENT_NUTRITION).find(k => ing === k)
    if (!key) key = Object.keys(INGREDIENT_NUTRITION).find(k => ing.includes(k) || k.includes(ing))
    if (!key) continue

    matched++
    const nutri  = INGREDIENT_NUTRITION[key]
    const weight = SERVING_WEIGHTS[key] || DEFAULT_WEIGHT
    const scale  = weight / 100  // nutrition data is per 100g

    totals.cal   += nutri.cal   * scale
    totals.pro   += nutri.pro   * scale
    totals.carb  += nutri.carb  * scale
    totals.fat   += nutri.fat   * scale
    totals.fiber += nutri.fiber * scale
  }

  if (matched === 0) return null

  // Divide by servings to get per-person values
  return {
    calories:  Math.round(totals.cal   / servings),
    protein_g: Math.round(totals.pro   / servings * 10) / 10,
    carbs_g:   Math.round(totals.carb  / servings * 10) / 10,
    fat_g:     Math.round(totals.fat   / servings * 10) / 10,
    fiber_g:   Math.round(totals.fiber / servings * 10) / 10,
    estimated: true, // flag that this wasn't user-entered
    matched_ingredients: matched,
    total_ingredients: ingredients.length,
  }
}

export function formatCalories(n) {
  return n ? `${n} cal` : '—'
}

export function formatMacro(n, unit = 'g') {
  return n != null ? `${n}${unit}` : '—'
}

// Simple color coding for nutrition density
export function nutritionColor(calories) {
  if (!calories) return 'var(--text-3)'
  if (calories < 300) return '#1F9E62'  // light
  if (calories < 600) return '#F59E0B'  // moderate
  return '#D4502A'                       // heavy
}

// Weekly totals from a plan
export function weeklyNutritionTotals(weeklyPlan, servings = 1) {
  let totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  let mealCount = 0

  if (!weeklyPlan) return { totals, mealCount, perDay: null }

  Object.values(weeklyPlan).forEach(day => {
    Object.values(day).forEach(meal => {
      if (!meal) return
      mealCount++
      // Prefer user-entered values, fall back to estimate
      const nut = (meal.calories != null)
        ? meal
        : estimateNutrition(meal.ingredients, servings)
      if (!nut) return
      totals.calories  += (nut.calories  || 0) * servings
      totals.protein_g += (nut.protein_g || 0) * servings
      totals.carbs_g   += (nut.carbs_g   || 0) * servings
      totals.fat_g     += (nut.fat_g     || 0) * servings
      totals.fiber_g   += (nut.fiber_g   || 0) * servings
    })
  })

  const days = Object.keys(weeklyPlan).length || 7
  const perDay = {
    calories:  Math.round(totals.calories  / days),
    protein_g: Math.round(totals.protein_g / days * 10) / 10,
    carbs_g:   Math.round(totals.carbs_g   / days * 10) / 10,
    fat_g:     Math.round(totals.fat_g     / days * 10) / 10,
    fiber_g:   Math.round(totals.fiber_g   / days * 10) / 10,
  }

  return { totals, perDay, mealCount }
}
