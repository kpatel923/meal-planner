import { estimateNutrition } from './nutrition'

// Keywords that suggest a meal is a dessert / sweet treat.
const DESSERT_HINTS = [
  'dessert', 'cake', 'cookie', 'brownie', 'pie', 'ice cream', 'pudding',
  'mousse', 'cheesecake', 'chocolate', 'sweet', 'candy', 'donut', 'doughnut',
  'muffin', 'cupcake', 'tart', 'crumble', 'cobbler', 'fudge', 'truffle',
  'parfait', 'sorbet', 'gelato', 'macaron', 'baklava', 'tiramisu', 'custard',
  'sundae', 'churro', 'flan', 'caramel', 'toffee', 'marshmallow',
]

// Find likely desserts already in the user's library. Prefers the real
// 'Dessert' category; falls back to keyword detection for older recipes that
// predate the category.
export function findLibraryDesserts(meals) {
  if (!meals?.length) return []
  const byCategory = meals.filter(m => m.category === 'Dessert')
  if (byCategory.length) return byCategory
  return meals.filter(m => {
    const text = `${m.item_name || ''}`.toLowerCase()
    return DESSERT_HINTS.some(h => text.includes(h))
  })
}

// Pick up to `n` desserts, favoring favorites and less-recently-used, with a
// little randomness so it isn't always the same suggestion.
export function recommendDesserts(meals, n = 3) {
  const pool = findLibraryDesserts(meals)
  if (!pool.length) return []
  const scored = pool.map(m => ({
    meal: m,
    score: (m.is_favorite ? 2 : 0) + Math.random(),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, n).map(s => s.meal)
}

// Shape an AI-generated dessert (from generateRecipeFromName) into a meal-like
// object the plan can hold. Nutrition is estimated from ingredients.
export function aiDessertToMeal(gen) {
  const nut = estimateNutrition(gen.ingredients, 1) || {}
  return {
    id: `ai-dessert-${Date.now()}`,
    item_name: gen.name,
    category: 'Dessert',
    ingredients: gen.ingredients,
    diet_type: gen.diet_type || 'veg',
    prep_time: gen.prep_time ?? null,
    detail_notes: gen.description || '',
    calories: nut.calories ?? null,
    protein_g: nut.protein_g ?? null,
    carbs_g: nut.carbs_g ?? null,
    fat_g: nut.fat_g ?? null,
    fiber_g: nut.fiber_g ?? null,
    source: 'ai',
    _aiDessert: true,
  }
}
