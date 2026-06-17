import { DAYS, CATEGORIES, CATEGORY_ICONS } from './mealLogic'
import { groupGroceryByCategory, GROCERY_CATEGORY_ORDER } from './groceryCategories'

// ── Share meal plan as text ──────────────────────────────────────────
export function buildPlanShareText(weeklyPlan, username = 'My') {
  const lines = [
    `🍽 ${username}'s Weekly Meal Plan`,
    `Generated ${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}`,
    '',
  ]

  DAYS.forEach((day, idx) => {
    const dayMeals = weeklyPlan[idx] || {}
    lines.push(`📅 ${day}`)
    CATEGORIES.forEach(cat => {
      const meal = dayMeals[cat]
      if (meal) lines.push(`  ${CATEGORY_ICONS[cat]} ${cat}: ${meal.item_name}`)
    })
    lines.push('')
  })

  lines.push('—')
  lines.push('Made with MealPlan 🥗')
  return lines.join('\n')
}

// ── Share grocery list as text ────────────────────────────────────────
export function buildGroceryShareText(groceryMap, username = 'My') {
  const grouped = groupGroceryByCategory(groceryMap)
  const lines   = [
    `🛒 ${username}'s Grocery List`,
    `${new Date().toLocaleDateString('en-US', { month:'long', day:'numeric' })}`,
    '',
  ]

  for (const cat of GROCERY_CATEGORY_ORDER) {
    const items = grouped[cat]
    if (!items || Object.keys(items).length === 0) continue
    lines.push(`── ${cat} ──`)
    Object.keys(items).sort().forEach(ing => {
      lines.push(`☐ ${ing.charAt(0).toUpperCase() + ing.slice(1)}`)
    })
    lines.push('')
  }

  lines.push('Made with MealPlan 🥗')
  return lines.join('\n')
}

// ── Web Share API (native share sheet on mobile) ─────────────────────
export async function shareText(title, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return { success: true }
    } catch (e) {
      if (e.name === 'AbortError') return { success: false, cancelled: true }
    }
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text)
    return { success: true, clipboard: true }
  } catch {
    return { success: false }
  }
}

// ── Generate shareable plan URL ───────────────────────────────────────
// Encodes the plan as a compressed base64 URL param so anyone can view it
export function buildShareableURL(weeklyPlan) {
  try {
    const compact = {}
    DAYS.forEach((_, idx) => {
      compact[idx] = {}
      CATEGORIES.forEach(cat => {
        const meal = weeklyPlan[idx]?.[cat]
        if (meal) compact[idx][cat] = meal.item_name
      })
    })
    const encoded = btoa(JSON.stringify(compact))
    return `${window.location.origin}/shared?plan=${encoded}`
  } catch { return null }
}

export function decodePlanURL(encoded) {
  try {
    return JSON.parse(atob(encoded))
  } catch { return null }
}
