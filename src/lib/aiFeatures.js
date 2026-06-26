import { supabase } from './supabase'

// ── AI helper — routes through a secure Supabase Edge Function ──────────
// The Groq API key lives server-side only (set as a Supabase secret).
// This file never touches the key directly. Provider-agnostic by design.

async function callAI(prompt, maxTokens = 400, imageBase64 = null) {
  const body = { prompt, maxTokens }
  if (imageBase64) body.imageBase64 = imageBase64

  const { data, error } = await supabase.functions.invoke('ai-chef', { body })

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
  if (data?._debug) {
    console.log('[ai-chef debug]', data._debug)
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

// ── Auto-detect recipe from a pasted URL ───────────────────────────────
// Now two-stage: (1) fetch the page's REAL title/description via the edge
// function (oEmbed for YouTube, Open Graph tags otherwise), (2) ask the AI to
// turn that real text into recipe fields. Far more accurate than guessing from
// the raw URL, because the dish name actually lives in the page title — not in
// an opaque video/reel ID.
export async function parseRecipeFromURL(url) {
  if (!url || !url.trim()) throw new Error('Please paste a URL first')

  const isVideo = /youtube|youtu\.be|instagram|tiktok/i.test(url)

  // Stage 1 — fetch real page metadata.
  let meta = { title: '', description: '', siteName: '' }
  try {
    const { data, error } = await supabase.functions.invoke('ai-chef', { body: { fetchUrl: url } })
    if (!error && data?.meta) meta = data.meta
  } catch { /* fall back to URL-only inference below */ }

  const haveMeta = !!(meta.title || meta.description)

  // Stage 2 — infer recipe fields from whatever we have.
  const sourceBlock = haveMeta
    ? `Here is the real metadata fetched from the page:
Title: ${meta.title || '(none)'}
Description: ${meta.description || '(none)'}
Site: ${meta.siteName || '(none)'}
URL: ${url}

Use the title and description as the primary source of truth.`
    : `A user pasted this recipe URL (page content could not be fetched — infer from the URL itself): ${url}`

  const prompt = `You are identifying a recipe from a ${isVideo ? 'video' : 'web'} link.

${sourceBlock}

From this, determine the most likely recipe. The title often contains the dish name directly. Strip channel names, emojis, and fluff like "EASY" or "in 10 minutes" from the dish name.

Respond with JSON ONLY, no markdown, no preamble:
{"name":"Recipe name","category":"Breakfast|Lunch|Dinner|Snack","diet_type":"veg|vegan|nonveg","ingredients":"comma, separated, likely, ingredients","confidence":"high|medium|low"}

If you genuinely cannot infer a dish, respond with:
{"name":"","category":"Dinner","diet_type":"veg","ingredients":"","confidence":"low"}`

  const raw = await callAI(prompt, 350)
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return {
      name:        parsed.name || meta.title || '',
      category:    parsed.category || 'Dinner',
      diet_type:   parsed.diet_type || 'veg',
      ingredients: parsed.ingredients || '',
      confidence:  parsed.confidence || (haveMeta ? 'medium' : 'low'),
      videoUrl:    isVideo ? url : '',
      writtenUrl:  !isVideo ? url : '',
    }
  } catch (e) {
    console.error('Failed to parse recipe from URL:', raw)
    // If we at least fetched a real title, return that rather than erroring out.
    if (meta.title) {
      return {
        name: meta.title, category: 'Dinner', diet_type: 'veg', ingredients: '',
        confidence: 'low', videoUrl: isVideo ? url : '', writtenUrl: !isVideo ? url : '',
      }
    }
    throw new Error('Could not detect recipe details from that URL — try entering manually')
  }
}

// ── Analyze a meal photo (vision) ─────────────────────────────────────
// Sends a photo to the vision model and gets back a structured recipe guess:
// dish name, likely ingredients (as a comma string so nutrition can be
// auto-estimated downstream), diet type, category, a short description, and a
// suggested search query for finding a matching recipe/video online.
// imageBase64 may be a raw base64 string or a full data URL.
export async function analyzeMealPhoto(imageBase64) {
  if (!imageBase64) throw new Error('No image provided')

  const prompt = `Look at this photo carefully and describe ONLY the food you can actually see in it. Do not guess a popular dish — describe what is literally visible (the visible components, colors, textures, cooking method).

First, in your own reasoning, note the key visual features. Then identify the dish based strictly on those features.

Provide:
- name: the most accurate name for what is shown (e.g. if you see grilled bread with melted cheese, say "Grilled Cheese Sandwich" — not a default guess)
- ingredients: a simple comma-separated list of the ingredients you can actually see or that are clearly part of this specific dish (common names like "bread, cheese, butter")
- diet_type: exactly one of veg, vegan, nonveg (use nonveg only if meat/fish/poultry is visible)
- category: exactly one of Breakfast, Lunch, Dinner, Snack
- description: one honest sentence about what's shown
- searchQuery: a short query to find this exact recipe online
- prepTime: estimated total time in minutes to make this dish (number only, e.g. 25)
- caloriesPerServing: rough calories per serving (number only, e.g. 480)
- confidence: high, medium, or low — use low if the image is unclear or you're unsure
- isFood: true only if the image actually contains food

Respond with JSON ONLY, no markdown backticks, no preamble:
{"isFood":true,"name":"Dish Name","ingredients":"ing1, ing2, ing3","diet_type":"veg","category":"Lunch","description":"A short honest description.","searchQuery":"dish name recipe","prepTime":25,"caloriesPerServing":480,"confidence":"medium"}`

  const raw = await callAI(prompt, 500, imageBase64)
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (parsed.isFood === false || (!parsed.name && !parsed.ingredients)) {
      throw new Error("That doesn't look like a meal — try another photo")
    }
    return {
      name:        parsed.name || '',
      category:    parsed.category || 'Dinner',
      diet_type:   ['veg', 'vegan', 'nonveg'].includes(parsed.diet_type) ? parsed.diet_type : 'nonveg',
      ingredients: parsed.ingredients || '',
      description: parsed.description || '',
      searchQuery: parsed.searchQuery || parsed.name || '',
      prepTime:    Number.isFinite(parsed.prepTime) ? parsed.prepTime : null,
      calories:    Number.isFinite(parsed.caloriesPerServing) ? parsed.caloriesPerServing : null,
      confidence:  parsed.confidence || 'low',
    }
  } catch (e) {
    if (e.message?.includes("doesn't look like")) throw e
    console.error('Failed to parse meal photo analysis:', raw)
    throw new Error('Could not read that photo — try a clearer shot of the dish')
  }
}

// ── Cook from fridge: detect ingredients from a photo ─────────────────
// Returns a de-duplicated list of food ingredients visible in a photo of a
// fridge, pantry, or pile of groceries. The user confirms/edits before we
// suggest meals, so this is best-effort detection, not a final answer.
export async function detectFridgeIngredients(imageBase64) {
  if (!imageBase64) throw new Error('No image provided')

  const prompt = `Look at this photo of someone's fridge, pantry, or grocery items. List every distinct FOOD INGREDIENT you can identify.

Rules:
- Only list actual food ingredients (e.g. "eggs", "spinach", "chicken", "milk", "cheddar cheese").
- Use simple, common names — not brands. "milk" not "Horizon 2% Organic".
- Combine duplicates; list each ingredient once.
- Ignore non-food items, containers, and condiments you can't clearly identify.
- If you can't tell what something is, leave it out rather than guess.

Respond with JSON ONLY, no markdown, no preamble:
{"isFood":true,"ingredients":["eggs","milk","spinach","chicken","cheddar cheese"]}

If the photo contains no identifiable food, respond:
{"isFood":false,"ingredients":[]}`

  const raw = await callAI(prompt, 400, imageBase64)
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (parsed.isFood === false || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Couldn't spot any ingredients — try a clearer, well-lit photo")
    }
    // normalize: trim, lowercase, dedupe, drop empties
    const seen = new Set()
    const list = []
    for (const item of parsed.ingredients) {
      const v = String(item || '').trim().toLowerCase()
      if (v && !seen.has(v)) { seen.add(v); list.push(v) }
    }
    return list
  } catch (e) {
    if (e.message?.includes("Couldn't spot")) throw e
    console.error('Failed to parse fridge detection:', raw)
    throw new Error('Could not read that photo — try a clearer, well-lit shot')
  }
}
