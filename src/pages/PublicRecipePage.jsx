import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { estimateNutrition, nutritionColor } from '../lib/nutrition'
import { estimateCost, getBudgetTag, BUDGET_TAG_STYLES, formatCost } from '../lib/budget'
import { ChefHat, Play, FileText, Flame, Loader2, AlertCircle } from 'lucide-react'

const DIET_LABELS = { veg: 'Vegetarian', vegan: 'Vegan', nonveg: 'Non-Vegetarian' }
const DIET_COLORS = {
  veg:    { bg:'rgba(31,158,98,0.1)',  text:'#1F9E62' },
  vegan:  { bg:'rgba(11,96,59,0.12)', text:'#3AB87D' },
  nonveg: { bg:'rgba(212,80,42,0.1)', text:'#D4502A' },
}
const CAT_ICONS = { Breakfast:'🍳', Lunch:'🥗', Dinner:'🍝', Snack:'🍎' }

function getVideoMeta(url) {
  if (!url) return null
  if (url.includes('youtube') || url.includes('youtu.be')) return { label: 'Watch Video', color: '#FF0000' }
  if (url.includes('instagram')) return { label: 'Watch Video', color: '#E1306C' }
  if (url.includes('tiktok')) return { label: 'Watch Video', color: '#000000' }
  return { label: 'Watch Video', color: '#1F9E62' }
}

export default function PublicRecipePage() {
  const { id } = useParams()
  const [meal,    setMeal]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .single()

      if (error || !data) setNotFound(true)
      else setMeal(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-3)' }} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6" style={{ background: 'var(--bg)' }}>
        <AlertCircle size={40} style={{ color: 'var(--text-3)', marginBottom: '16px' }} />
        <h1 className="font-display font-bold mb-2" style={{ fontSize: '24px', color: 'var(--text)' }}>Recipe not found</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '24px' }}>
          This recipe may have been removed or is no longer shared publicly.
        </p>
        <Link to="/" className="btn-primary btn">Go to MealPlan</Link>
      </div>
    )
  }

  const dc = DIET_COLORS[meal.diet_type] || DIET_COLORS.veg
  const ingredients = meal.ingredients?.split(',').map(i => i.trim()).filter(Boolean) || []
  const videoMeta = getVideoMeta(meal.video_url)
  const nutrition = meal.calories != null
    ? { calories: meal.calories, protein_g: meal.protein_g, carbs_g: meal.carbs_g, fat_g: meal.fat_g, fiber_g: meal.fiber_g }
    : estimateNutrition(meal.ingredients, 1)
  const cost = meal.cost_per_serving != null ? meal.cost_per_serving : estimateCost(meal.ingredients)
  const budgetTag = meal.budget_tag || (cost != null ? getBudgetTag(cost) : null)
  const budgetStyle = budgetTag ? BUDGET_TAG_STYLES[budgetTag] : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Minimal branded header */}
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(145deg,#27B872,#0B4529)' }}>
          <ChefHat size={16} className="text-white" />
        </div>
        <span className="font-display font-semibold" style={{ fontSize: '16px', color: 'var(--text)' }}>MealPlan</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-16">

        {/* Photo */}
        {meal.photo_url && (
          <div className="rounded-3xl overflow-hidden mb-6" style={{ height: '280px' }}>
            <img src={meal.photo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="badge" style={{ background: dc.bg, color: dc.text, fontSize: '12px' }}>
            {DIET_LABELS[meal.diet_type]}
          </span>
          <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)', fontSize: '12px' }}>
            {CAT_ICONS[meal.category]} {meal.category}
          </span>
          {budgetStyle && (
            <span className="badge" style={{ background: budgetStyle.bg, color: budgetStyle.color, fontSize: '12px' }}>
              {budgetStyle.emoji} {budgetStyle.label}
            </span>
          )}
        </div>

        <h1 className="font-display font-bold mb-7" style={{ fontSize: 'clamp(28px,5vw,40px)', color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
          {meal.item_name}
        </h1>

        {/* Nutrition */}
        {nutrition?.calories != null && (
          <div className="grid grid-cols-5 gap-2 mb-8">
            {[
              { label: 'Cal', val: nutrition.calories, unit: '' },
              { label: 'Protein', val: nutrition.protein_g, unit: 'g' },
              { label: 'Carbs', val: nutrition.carbs_g, unit: 'g' },
              { label: 'Fat', val: nutrition.fat_g, unit: 'g' },
              { label: 'Fiber', val: nutrition.fiber_g, unit: 'g' },
            ].map(({ label, val, unit }) => (
              <div key={label} className="text-center p-3 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="font-display font-bold" style={{ fontSize: '18px', color: 'var(--text)' }}>{val != null ? `${val}${unit}` : '—'}</p>
                <p style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Ingredients */}
        <div className="mb-8">
          <p className="font-semibold mb-3" style={{ fontSize: '15px', color: 'var(--text)' }}>🛒 Ingredients</p>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing, i) => (
              <span key={i} className="px-3 py-2 rounded-xl capitalize" style={{ fontSize: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                {ing}
              </span>
            ))}
          </div>
        </div>

        {meal.detail_notes && (
          <div className="mb-8">
            <p className="font-semibold mb-2" style={{ fontSize: '15px', color: 'var(--text)' }}>📝 Notes</p>
            <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{meal.detail_notes}</p>
          </div>
        )}

        {/* Links */}
        {(meal.video_url || meal.written_url) && (
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            {meal.video_url && (
              <a href={meal.video_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl py-4 font-bold text-white"
                style={{ background: videoMeta.color, fontSize: '15px' }}>
                <Play size={16} /> {videoMeta.label}
              </a>
            )}
            {meal.written_url && (
              <a href={meal.written_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl py-4 font-bold"
                style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text)', fontSize: '15px' }}>
                <FileText size={16} /> Read Recipe
              </a>
            )}
          </div>
        )}

        {/* Footer CTA */}
        <div className="text-center py-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '12px' }}>
            Shared from MealPlan — plan your week, generate grocery lists, and save recipes you love.
          </p>
          <Link to="/" className="btn-secondary btn">Try MealPlan free</Link>
        </div>
      </div>
    </div>
  )
}
