import { useState } from 'react'
import { useSwipeToClose } from '../hooks/useSwipeToClose'
import { supabase } from '../lib/supabase'
import { DIET_LABELS } from '../lib/mealLogic'
import { estimateNutrition } from '../lib/nutrition'
import { estimateCost, getBudgetTag, BUDGET_TAG_STYLES, formatCost } from '../lib/budget'
import { formatPrepTime } from '../lib/mealFacts'
import { Sparkles, X, Edit2, Trash2, Play, Camera, FileText, Flame, Loader2, Clock, Heart, ArrowLeftRight, MoveRight } from 'lucide-react'
import toast from 'react-hot-toast'

export const DIET_COLORS = {
  veg:    { bg: 'rgba(26,143,92,0.12)',  text: 'var(--success)' },
  vegan:  { bg: 'rgba(26,143,92,0.16)',  text: 'var(--success)' },
  nonveg: { bg: 'var(--danger-light)',   text: 'var(--danger)' },
}

export const SOURCE_BADGES = {
  ai:     { label: 'AI', icon: <Sparkles size={10} />, bg: 'rgba(139,95,191,0.12)', text: '#8B5FBF' },
  import: { label: 'Imported', icon: null, bg: 'rgba(217,137,46,0.12)', text: '#D9892E' },
}

export const CAT_ICONS = { Breakfast: '🍳', Lunch: '🥗', Dinner: '🍝', Snack: '🍎', Dessert: '🍰' }

export function getVideoMeta(url) {
  if (!url) return null
  if (url.includes('youtube') || url.includes('youtu.be')) return { icon: <Play size={14} />, label: 'Watch Video', platform: 'YouTube', color: 'var(--danger)' }
  if (url.includes('instagram')) return { icon: <Camera size={14} />, label: 'Watch Video', platform: 'Instagram', color: '#E1306C' }
  if (url.includes('tiktok')) return { icon: <Play size={14} />, label: 'Watch Video', platform: 'TikTok', color: '#1D1D1F' }
  return { icon: <Play size={14} />, label: 'Watch Video', platform: 'Video', color: 'var(--brand)' }
}

/**
 * Shared recipe detail modal — used on both the Recipes page and the Planner page
 * so every meal card, anywhere in the app, opens the exact same rich view.
 *
 * onEdit / onDelete are optional — pass nothing to hide those actions
 * (e.g. when viewing a meal from a read-only context).
 */
export default function RecipeDetailModal({ meal, onClose, onEdit, onDelete, onToggleFavorite, onSwap, onMove }) {
  const [sharing, setSharing] = useState(false)
  const swipe = useSwipeToClose(onClose)
  if (!meal) return null

  const dc = DIET_COLORS[meal.diet_type] || DIET_COLORS.veg
  const videoMeta = getVideoMeta(meal.video_url)
  const ingredients = meal.ingredients?.split(',').map(i => i.trim()).filter(Boolean) || []
  const sourceBadge = SOURCE_BADGES[meal.source]

  const nutrition = meal.calories != null
    ? { calories: meal.calories, protein_g: meal.protein_g, carbs_g: meal.carbs_g, fat_g: meal.fat_g, fiber_g: meal.fiber_g }
    : estimateNutrition(meal.ingredients, 1)
  const cost = meal.cost_per_serving != null ? meal.cost_per_serving : estimateCost(meal.ingredients)
  const budgetTag = meal.budget_tag || (cost != null ? getBudgetTag(cost) : null)
  const budgetStyle = budgetTag ? BUDGET_TAG_STYLES[budgetTag] : null
  const prepLabel = formatPrepTime(meal.prep_time)

  async function handleShareRecipe() {
    setSharing(true)
    try {
      if (!meal.is_public) {
        const { error } = await supabase.from('meals').update({ is_public: true }).eq('id', meal.id)
        if (error) throw error
      }
      const url = `${window.location.origin}/recipe/${meal.id}`
      if (navigator.share) {
        await navigator.share({ title: meal.item_name, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
      }
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error('Could not create share link')
    }
    setSharing(false)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={swipe.style} {...swipe.handlers}>
        {/* Drag handle (mobile swipe-to-close affordance) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-2)' }} />
        </div>
        {/* Photo */}
        {meal.photo_url && (
          <div style={{ height: '240px', overflow: 'hidden' }}>
            <img src={meal.photo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="relative p-6 sm:p-8" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn-ghost btn-icon absolute top-5 right-5 tap-target"
            style={{ background: 'var(--surface-2)' }}>
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-4 flex-wrap pr-12">
            <span className="badge" style={{ background: dc.bg, color: dc.text }}>
              {DIET_LABELS[meal.diet_type]?.label}
            </span>
            <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              {CAT_ICONS[meal.category]} {meal.category}
            </span>
            {sourceBadge && (
              <span className="badge" style={{ background: sourceBadge.bg, color: sourceBadge.text }}>
                {sourceBadge.icon} {sourceBadge.label}
              </span>
            )}
            {budgetStyle && (
              <span className="badge" style={{ background: budgetStyle.bg, color: budgetStyle.color }}>
                {budgetStyle.emoji} {budgetStyle.label}{cost != null ? ` · ${formatCost(cost)}` : ''}
              </span>
            )}
            {prepLabel && (
              <span className="badge flex items-center gap-1" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                <Clock size={11} /> {prepLabel}
              </span>
            )}
          </div>

          <h2 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(24px, 4vw, 32px)', color: 'var(--text)', letterSpacing: '-0.035em' }}>
            {meal.item_name}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-8">

          {/* Nutrition */}
          {nutrition?.calories != null && (
            <div>
              <p className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                <Flame size={13} /> NUTRITION
                {nutrition.estimated && <span style={{ fontSize: '11px', fontWeight: 400 }}>(estimated)</span>}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Cal',     val: nutrition.calories,  unit: '' },
                  { label: 'Protein', val: nutrition.protein_g, unit: 'g' },
                  { label: 'Carbs',   val: nutrition.carbs_g,   unit: 'g' },
                  { label: 'Fat',     val: nutrition.fat_g,     unit: 'g' },
                  { label: 'Fiber',   val: nutrition.fiber_g,   unit: 'g' },
                ].map(({ label, val, unit }) => (
                  <div key={label} className="text-center py-3 rounded-2xl" style={{ background: 'var(--surface-2)' }}>
                    <p className="font-display font-bold" style={{ fontSize: '17px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      {val != null ? `${val}${unit}` : '—'}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, marginTop: '2px' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          <div>
            <p className="font-semibold mb-3" style={{ fontSize: '13px', color: 'var(--text-2)' }}>
              INGREDIENTS <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>({ingredients.length})</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full capitalize"
                  style={{ fontSize: '13.5px', background: 'var(--surface-2)', color: 'var(--text)' }}>
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          {meal.detail_notes && (
            <div>
              <p className="font-semibold mb-2.5" style={{ fontSize: '13px', color: 'var(--text-2)' }}>NOTES</p>
              <p style={{ fontSize: '14.5px', color: 'var(--text-2)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {meal.detail_notes}
              </p>
            </div>
          )}

          {/* Links — saved media, plus search fallbacks so there's always a way */}
          <div>
            <p className="font-semibold mb-2.5" style={{ fontSize: '13px', color: 'var(--text-2)' }}>WATCH &amp; READ</p>
            <div className="flex flex-col sm:flex-row gap-3">
              {meal.video_url && videoMeta ? (
                <a href={meal.video_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl transition-transform duration-150 active:scale-[0.97] tap-target"
                  style={{ padding: '14px 20px', background: videoMeta.color, color: '#fff', fontSize: '15px', fontWeight: 600 }}>
                  {videoMeta.icon} {videoMeta.label}
                </a>
              ) : (
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(meal.item_name + ' recipe')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl transition-transform duration-150 active:scale-[0.97] tap-target"
                  style={{ padding: '14px 20px', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>
                  <Play size={16} style={{ color: '#FF0000' }} /> Find a video
                </a>
              )}
              {meal.written_url ? (
                <a href={meal.written_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl transition-transform duration-150 active:scale-[0.97] tap-target"
                  style={{ padding: '14px 20px', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>
                  <FileText size={16} /> Read recipe
                </a>
              ) : (
                <a href={`https://www.google.com/search?q=${encodeURIComponent(meal.item_name + ' recipe')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl transition-transform duration-150 active:scale-[0.97] tap-target"
                  style={{ padding: '14px 20px', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>
                  <FileText size={16} /> Find recipe
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Planner actions — only when opened from the planner */}
        {(onSwap || onMove) && (
          <div className="px-6 sm:px-8 pb-3">
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
              In your plan
            </p>
            <div className="flex gap-2">
              {onSwap && (
                <button onClick={() => onSwap(meal)} className="btn-secondary btn flex-1 tap-target gap-1.5">
                  <ArrowLeftRight size={15} /> Swap
                </button>
              )}
              {onMove && (
                <button onClick={() => onMove(meal)} className="btn-secondary btn flex-1 tap-target gap-1.5">
                  <MoveRight size={15} /> Move day
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 p-6 sm:p-8 pt-0">
          <button onClick={handleShareRecipe} disabled={sharing} className="btn-secondary btn flex-1 tap-target">
            {sharing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Share
          </button>
          {onToggleFavorite && (
            <button onClick={() => onToggleFavorite(meal)} className="btn-secondary btn tap-target"
              aria-label={meal.is_favorite ? 'Unfavorite' : 'Favorite'}
              style={{ color: meal.is_favorite ? 'var(--danger)' : 'var(--text-2)' }}>
              <Heart size={16} fill={meal.is_favorite ? 'var(--danger)' : 'none'} />
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(meal)} className="btn-secondary btn flex-1 tap-target">
              <Edit2 size={16} /> Edit
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(meal)} className="btn-danger btn flex-1 tap-target">
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
