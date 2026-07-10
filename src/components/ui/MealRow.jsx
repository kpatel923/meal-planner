import { useState } from 'react'
import { Check, X } from 'lucide-react'
import StatPill from './StatPill'
import { getMealFacts } from '../../lib/mealFacts'
import { successHaptic, tapHaptic } from '../../lib/haptics'

const CAT_ICONS = { Breakfast: '🍳', Lunch: '🥗', Dinner: '🍝', Snack: '🍎', Dessert: '🍰' }

// The canonical meal row — refined + energetic. Calm white surface with a
// hairline border and gentle lift; the lime does deliberate work at the
// category label, calorie pill, and check. Recipe photo anchors the row
// (icon-chip fallback). Used on Today, Planner, and anywhere meals appear.
export default function MealRow({
  meal, category, servings = 1,
  prepped = false, onTogglePrep,
  onView, onRemove,
  accent = false,
}) {
  if (!meal) return null
  const [imgOk, setImgOk] = useState(true)
  const facts = getMealFacts(meal, servings)
  const icon = CAT_ICONS[category] || '🍽️'
  const photo = meal.photo_url || meal.image_url
  const hasPhoto = photo && imgOk

  function handleCheck(e) {
    e.stopPropagation()
    if (!prepped) successHaptic(); else tapHaptic()
    onTogglePrep?.()
  }

  return (
    <div className="flex items-center gap-3.5"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--hairline, var(--border))'}`,
        borderRadius: 18,
        padding: hasPhoto ? '12px 15px 12px 12px' : '13px 15px',
        boxShadow: '0 3px 12px rgba(22,23,15,0.05)',
        opacity: prepped ? 0.6 : 1,
        transition: 'opacity 0.25s ease, transform 0.15s ease',
      }}>
      {onTogglePrep && (
        <button onClick={handleCheck}
          aria-label={prepped ? 'Mark not cooked' : 'Mark cooked'}
          className="flex items-center justify-center shrink-0 transition-all active:scale-90"
          style={{
            width: 28, height: 28, borderRadius: 9,
            border: `2px solid ${prepped ? 'var(--accent)' : 'var(--border-2)'}`,
            background: prepped ? 'var(--accent)' : 'transparent',
          }}>
          {prepped && <Check size={15} strokeWidth={2.8} style={{ color: '#fff', animation: 'checkPopIn 0.34s cubic-bezier(0.22,1.5,0.5,1)' }} />}
        </button>
      )}

      <button onClick={() => onView?.(meal)} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
        {hasPhoto ? (
          <div className="shrink-0" style={{ width: 50, height: 50, borderRadius: 14, overflow: 'hidden', boxShadow: '0 3px 10px rgba(0,0,0,0.10)' }}>
            <img src={photo} alt="" onError={() => setImgOk(false)} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex items-center justify-center shrink-0"
            style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--accent-light)', fontSize: 21 }}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 1 }}>
            <span style={{ color: accent ? 'var(--accent-text)' : 'var(--accent-dark)' }}>{category}</span>
            {facts.prepTime != null && <span style={{ color: 'var(--text-3)', fontWeight: 500 }}> · {facts.prepTime} min</span>}
          </p>
          <p className="font-display truncate"
            style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)', textDecoration: prepped ? 'line-through' : 'none', textDecorationColor: 'var(--text-3)' }}>
            {meal.item_name}
          </p>
        </div>
      </button>

      {facts.calories != null && (
        <StatPill kind="cal" value={facts.calories} tone={prepped ? 'muted' : 'accent'} />
      )}
      {onRemove && (
        <button onClick={onRemove} aria-label="Remove" className="btn-ghost btn-icon shrink-0" style={{ color: 'var(--text-3)' }}>
          <X size={16} />
        </button>
      )}
    </div>
  )
}
