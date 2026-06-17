import { supabase } from './supabase'

// ── AI helper — routes through a secure Supabase Edge Function ──────────
// The Groq API key lives server-side only (set as a Supabase secret).
// This file never touches the key directly. Provider-agnostic by design —
// the edge function can be swapped to any LLM without changing this file.

async function callClaude(prompt, maxTokens = 400) {
  const { data, error } = await supabase.functions.invoke('ai-chef', {
    body: { prompt, maxTokens },
  })

  if (error) {
    // supabase.functions.invoke() throws a generic "non-2xx status code" message
    // on HTTP errors — the real error body is in error.context (a Response object)
    let detail = error.message
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) detail = body.error
      }
    } catch { /* context wasn't readable JSON, fall back to generic message */ }

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

  return callClaude(prompt, 150)
}

// ── AI Meal Suggestions ────────────────────────────────────────────────
export async function getMealSuggestions(ingredientsOnHand, existingMealNames, category = 'any') {
  const prompt = `You are a creative meal planning assistant. A user has these ingredients available: ${ingredientsOnHand}

Their meal library already includes: ${existingMealNames.slice(0, 20).join(', ')}

Suggest 5 meal ideas${category !== 'any' ? ` for ${category}` : ''} they could make with what they have. For each meal give:
- A creative name
- The main ingredients needed (from what they have)
- Whether it's vegan, veg, or nonveg

Format as JSON array ONLY, no markdown, like:
[{"name":"Meal Name","ingredients":"ing1, ing2, ing3","diet_type":"veg","category":"Breakfast"}]`

  const raw = await callClaude(prompt, 600)
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('Failed to parse AI suggestions:', raw)
    return []
  }
}

// ── AI Recipe Card Description ─────────────────────────────────────────
export async function generateRecipeTagline(mealName, ingredients) {
  const prompt = `Write a single enticing 8-12 word tagline for this recipe: "${mealName}" made with ${ingredients}. Just the tagline, nothing else.`
  return callClaude(prompt, 50)
}
