import { supabase } from './supabase'

// ── AI helper — routes through a secure Supabase Edge Function ──────────
// The Groq API key lives server-side only (set as a Supabase secret).
// This file never touches the key directly. Provider-agnostic by design.

async function callAI(prompt, maxTokens = 400) {
  const { data, error } = await supabase.functions.invoke('ai-chef', {
    body: { prompt, maxTokens },
  })

  if (error) {
    let detail = error.message
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) detail = body.error
      }
    } catch { /* fall back to generic message */ }
    console.error('AI Chef error:', detail)
    throw new Error(detail || 'AI request failed')
  }
  if (data?.error) {
    console.error('AI Chef server error:', data.error)
    throw new Error(data.error)
  }
  return data?.text || ''
}

// ── AI Plan Description ───────────────────────────────────────────────
export async function generatePlanDescription(weeklyPlan, DAYS, CATEGORIES) {
  const meals = []
  DAYS.forEach((day, idx) => {
    CATEGORIES.forEach(cat => {
      const m = weeklyPlan[idx]?.[cat]
      if (m) meals.push(m.item_name)
    })
  })

  const prompt = `You are a friendly meal planning assistant. Based on this weekly meal plan, write a short, upbeat 2-3 sentence description (max 60 words) that highlights the overall vibe, dominant ingredients or cuisines, and what makes this week's eating interesting. Keep it warm and motivating.

Meals this week: ${meals.join(', ')}

Respond with ONLY the description, no preamble.`

  return callAI(prompt, 150)
}

// ── AI Meal Suggestions ────────────────────────────────────────────────
// sourceMode: 'library' = only use existing meals | 'web' = suggest new ones | 'both' = mixed
// dietPreferences: array like ['veg','vegan','nonveg'] from the user's profile
export async function getMealSuggestions({
  ingredientsOnHand,
  existingMeals = [],
  category = 'any',
  sourceMode = 'both',
  dietPreferences = ['veg','vegan','nonveg'],
  servings = 2,
}) {
  const dietLabel = dietPreferences.length === 3
    ? 'any diet type'
    : dietPreferences.map(d => d === 'veg' ? 'vegetarian' : d === 'vegan' ? 'vegan' : 'non-vegetarian').join(' or ')

  let systemContext = ''

  if (sourceMode === 'library' && existingMeals.length > 0) {
    systemContext = `The user wants to find matching meals from their existing recipe library. Here are their saved meals:
${existingMeals.map(m => `- ${m.item_name} (${m.category}, ${m.diet_type}): ${m.ingredients}`).join('\n')}

Based on the ingredients they have, suggest up to 5 meals FROM THIS LIST that they can make now. Only suggest meals where they have most of the ingredients.`
  } else if (sourceMode === 'web') {
    systemContext = `Suggest 5 creative new meal ideas the user could make. These should be new recipes not necessarily in their library. Their existing meals are: ${existingMeals.slice(0,10).map(m => m.item_name).join(', ')} — try to suggest something different.`
  } else {
    // 'both'
    systemContext = `Suggest 5 meal ideas — some can be from their existing library, some can be new ideas. Their existing meals include: ${existingMeals.slice(0,15).map(m => m.item_name).join(', ')}.`
  }

  const prompt = `You are a creative meal planning assistant. The user has these ingredients available: ${ingredientsOnHand}

${systemContext}

Requirements:
- Diet preference: ${dietLabel}
- Cooking for: ${servings} ${servings === 1 ? 'person' : 'people'}
${category !== 'any' ? `- Meal type: ${category}` : ''}
- Adjust ingredients/quantities for ${servings} ${servings === 1 ? 'person' : 'people'}

For each meal provide:
- A clear name
- The main ingredients needed (scaled for ${servings} ${servings === 1 ? 'person' : 'people'})
- Diet type (must be one of: veg, vegan, nonveg)
- Category (must be one of: Breakfast, Lunch, Dinner, Snack)
- A one-sentence description of what makes this meal great
- Whether it's from their existing library (fromLibrary: true/false)

Respond with a JSON array ONLY, no markdown backticks, no preamble:
[{"name":"Meal Name","ingredients":"ing1, ing2, ing3","diet_type":"veg","category":"Dinner","description":"Quick and satisfying weeknight meal.","fromLibrary":false}]`

  const raw = await callAI(prompt, 800)
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('Failed to parse AI suggestions:', raw)
    return []
  }
}

// ── AI Recipe Tagline ─────────────────────────────────────────────────
export async function generateRecipeTagline(mealName, ingredients) {
  const prompt = `Write a single enticing 8-12 word tagline for this recipe: "${mealName}" made with ${ingredients}. Just the tagline, nothing else.`
  return callAI(prompt, 50)
}
