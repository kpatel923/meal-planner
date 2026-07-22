import { supabase } from './supabase'

// ── AI helper — routes through a secure Supabase Edge Function ──────────
// The Groq API key lives server-side only (set as a Supabase secret).
// This file never touches the key directly. Provider-agnostic by design.

// Pull a suggested wait (seconds) out of Groq's rate-limit message, if present.
function parseRetrySeconds(msg) {
  const m = /try again in ([\d.]+)\s*s/i.exec(msg || '')
  const secs = m ? parseFloat(m[1]) : NaN
  return Number.isFinite(secs) ? Math.min(secs, 30) : null
}

function isRateLimit(msg) {
  return /429|rate limit/i.test(msg || '')
}

// Robustly pull a JSON object out of a model response. Reasoning models (and
// chatty ones) often wrap the answer in <think> blocks, markdown fences, or a
// sentence of preamble — a bare JSON.parse would fail on all of those. This
// strips the noise and extracts the first balanced {...} block.
export function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty AI response')
  let s = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')   // reasoning blocks
    .replace(/<\/?think>/gi, '')                 // stray/unclosed tags
    .replace(/```json|```/g, '')                 // markdown fences
    .trim()

  // Fast path: already valid JSON.
  try { return JSON.parse(s) } catch { /* keep going */ }

  // Otherwise find the first balanced object, ignoring braces inside strings.
  const start = s.indexOf('{')
  if (start === -1) throw new Error('No JSON object in AI response')
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc) { esc = false; continue }
    if (c === '\\') { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return JSON.parse(s.slice(start, i + 1))
    }
  }
  throw new Error('Incomplete JSON in AI response')
}

async function callAI(prompt, maxTokens = 400, imageBase64 = null, opts = {}) {
  const { jsonMode = false, _attempt = 0 } = opts
  const body = { prompt, maxTokens }
  if (imageBase64) body.imageBase64 = imageBase64
  if (jsonMode) body.jsonMode = true

  const { data, error } = await supabase.functions.invoke('ai-chef', { body })

  let detail = null
  if (error) {
    detail = error.message
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) detail = body.error
      }
    } catch { /* fall back to generic message */ }
  } else if (data?.error) {
    detail = data.error
  }

  if (detail) {
    // Rate limited: wait the suggested time and retry once or twice. Groq's
    // free tier is 8k tokens/minute, which a vision call can bump into.
    if (isRateLimit(detail) && _attempt < 2) {
      const wait = parseRetrySeconds(detail) ?? 6
      await new Promise(r => setTimeout(r, (wait + 0.5) * 1000))
      return callAI(prompt, maxTokens, imageBase64, { ...opts, _attempt: _attempt + 1 })
    }
    console.error('AI Chef error:', detail)
    if (isRateLimit(detail)) {
      throw new Error('AI is busy right now (rate limit) — wait a few seconds and try again.')
    }
    throw new Error(detail || 'AI request failed')
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

// ── AI Daily Summary (Today page) ──────────────────────────────────────
// Given today's meals and how many are done, returns a short warm recap plus
// one inspiring line. Returns a plain string.
export async function generateDailySummary({ meals, doneCount, totalCount, calories, calorieGoal }) {
  const mealList = meals.length ? meals.join(', ') : 'no meals planned yet'
  const progress = totalCount > 0 ? `${doneCount} of ${totalCount} meals cooked` : 'nothing planned'
  const calLine = calories && calorieGoal ? ` About ${calories} of ${calorieGoal} calories so far.` : ''

  const prompt = `You are a warm, encouraging meal companion. Write a short daily note (max 45 words, 2 sentences) for someone's meal day. First sentence: a friendly recap of their day's food and cooking progress. Second sentence: one genuinely uplifting, non-cheesy line to inspire them (about nourishment, self-care, or momentum — vary it).

Today's meals: ${mealList}
Progress: ${progress}.${calLine}

Respond with ONLY the note, no preamble, no quotes.`

  return callAI(prompt, 120)
}
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
    const parsed = extractJSON(raw)
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
// ── Generate a recipe from just its name ──────────────────────────────
// Fills the RELIABLE fields (ingredients, category, diet, prep, calories,
// description). For media it returns SEARCH links (YouTube/Google) rather than
// fabricated direct URLs — an LLM can't verify a real video/photo exists, so we
// never invent one. Everything is editable; the user reviews before saving.
// ── Cook Mode step generation ─────────────────────────────────────────
// Turns a recipe into clean numbered steps with optional per-step timers.
// Uses stored detail_notes/ingredients as context. Cached by the caller.
export async function generateCookSteps(meal) {
  const name = meal?.item_name || 'this dish'
  const ingredients = meal?.ingredients || ''
  const notes = meal?.detail_notes || ''

  const prompt = `You are a cooking guide. Break "${name}" into clear, ordered cooking steps for a home cook.
Ingredients: ${ingredients}
${notes ? `Notes: ${notes}` : ''}

Respond with JSON ONLY (no markdown):
{"steps":[{"text":"what to do in this step, 1-2 sentences","timerSeconds": <seconds if this step involves waiting/cooking/baking, else null>}]}

Rules:
- 4 to 8 steps. Concrete and practical.
- Add timerSeconds ONLY for steps with real waiting (boiling, baking, simmering, resting). Use null otherwise.
- Keep each step short enough to read at a glance while cooking.`

  const raw = await callAI(prompt, 700)
  let parsed
  try {
    parsed = extractJSON(raw)
  } catch {
    // Fallback: split detail_notes into sentence steps if AI parse fails.
    const sentences = (notes || `Prepare ${name} using: ${ingredients}`)
      .split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
    return sentences.slice(0, 8).map(text => ({ text, timerSeconds: null }))
  }
  if (!parsed.steps || !parsed.steps.length) {
    return [{ text: `Prepare ${name} using: ${ingredients}`, timerSeconds: null }]
  }
  return parsed.steps.map(s => ({
    text: s.text || '',
    timerSeconds: Number.isFinite(s.timerSeconds) ? s.timerSeconds : null,
  })).filter(s => s.text)
}

// Fetch a real, relevant food photo for a dish via the image-search function
// (Pexels, server-side). Returns a URL string or null. Never throws —
// a missing photo should never block adding a recipe.
export async function searchRecipeImage(query) {
  if (!query || !query.trim()) return null
  try {
    const { data, error } = await supabase.functions.invoke('image-search', {
      body: { query: query.trim() },
    })
    if (error) return null
    return data?.url || null
  } catch {
    return null
  }
}

export async function generateRecipeFromName(name) {
  if (!name || !name.trim()) throw new Error('Enter a meal name first')
  const dish = name.trim()

  const prompt = `You are a culinary assistant. A user wants to add a recipe called "${dish}" to their meal planner. Infer the most likely details for a typical version of this dish.

Respond with JSON ONLY, no markdown, no preamble:
{"name":"cleaned dish name","category":"Breakfast|Lunch|Dinner|Snack","diet_type":"veg|vegan|nonveg","ingredients":"comma, separated, core, ingredients","prep_time":<minutes as integer>,"description":"one or two appetizing sentences about the dish","confidence":"high|medium|low"}

Rules:
- ingredients: 5-12 core ingredients as a plain comma-separated string (this drives nutrition estimation, so use common ingredient names like "chicken, rice, onion").
- Do NOT invent any URLs, links, calorie numbers, or costs — those are handled elsewhere.
- If "${dish}" is not a recognizable food, respond with {"name":"","category":"Dinner","diet_type":"veg","ingredients":"","prep_time":20,"description":"","confidence":"low"}`

  const raw = await callAI(prompt, 400)
  let parsed
  try {
    parsed = extractJSON(raw)
  } catch {
    throw new Error('Could not generate that recipe — try a different name or enter it manually')
  }
  if (!parsed.name && !parsed.ingredients) {
    throw new Error(`Couldn't recognize "${dish}" as a dish — try being more specific, or enter details manually`)
  }

  // Honest media: search links that always work, never fabricated direct URLs.
  const q = encodeURIComponent(`${dish} recipe`)
  return {
    name:        parsed.name || dish,
    category:    parsed.category || 'Dinner',
    diet_type:   parsed.diet_type || 'veg',
    ingredients: parsed.ingredients || '',
    prep_time:   Number.isFinite(parsed.prep_time) ? parsed.prep_time : null,
    description: parsed.description || '',
    confidence:  parsed.confidence || 'medium',
    // Search links (open a real search for the dish) — reliable, never dead.
    videoSearchUrl:   `https://www.youtube.com/results?search_query=${q}`,
    writtenSearchUrl: `https://www.google.com/search?q=${q}`,
  }
}

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
    const parsed = extractJSON(raw)
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

  const raw = await callAI(prompt, 600, imageBase64, { jsonMode: true })
  try {
    const parsed = extractJSON(raw)
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
    console.error('Failed to parse meal photo analysis. Raw model output:', raw)
    // Surface a snippet of what actually came back — "try a clearer photo" is
    // misleading when the real problem is the model replying with prose.
    const snippet = (raw || '').trim().slice(0, 120).replace(/\s+/g, ' ')
    throw new Error(
      snippet
        ? `AI didn't return recipe data. It said: "${snippet}…"`
        : 'AI returned an empty response — try again in a moment'
    )
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

  const raw = await callAI(prompt, 500, imageBase64, { jsonMode: true })
  try {
    const parsed = extractJSON(raw)
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
