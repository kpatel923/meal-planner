import { useState } from 'react'
import { Check, X } from 'lucide-react'
import StatPill from './StatPill'
import { getMealFacts } from '../../lib/mealFacts'
import { successHaptic, tapHaptic } from '../../lib/haptics'

const CAT_ICONS = { Breakfast: '🍳', Lunch: '🥗', Dinner: '🍝', Snack: '🍎', Dessert: '🍰' }

// The canonical meal row — elevated card, recipe photo (icon-chip fallback),
// prep check + calorie pill. Used on Today, Planner, and anywhere a planned
// meal is listed. Tap opens detail (onView).
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

  const subtitle = [category, facts.prepTime != null ? `${facts.prepTime} min` : null]
    .filter(Boolean).join(' · ')

  function handleCheck(e) {
    e.stopPropagation()
    if (!prepped) successHaptic(); else tapHaptic()
    onTogglePrep?.()
  }

  return (
    <div className="flex items-center gap-3"
      style={{
        background: 'linear-gradient(180deg, var(--surface), var(--surface-2))',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 20,
        padding: hasPhoto ? '11px 15px 11px 11px' : '11px 15px',
        boxShadow: 'var(--shadow-lg)',
        opacity: prepped ? 0.62 : 1,
        transition: 'opacity 0.25s ease, transform 0.15s ease',
      }}>
      {onTogglePrep && (
        <button onClick={handleCheck}
          aria-label={prepped ? 'Mark not cooked' : 'Mark cooked'}
          className="flex items-center justify-center shrink-0 transition-all active:scale-90"
          style={{
            width: 29, height: 29, borderRadius: 9,
            border: `2px solid ${prepped ? 'var(--accent)' : 'var(--border-2)'}`,
            background: prepped ? 'var(--accent)' : 'transparent',
          }}>
          {prepped && <Check size={16} strokeWidth={2.6} style={{ color: '#1A1C16', animation: 'checkPopIn 0.34s cubic-bezier(0.22,1.4,0.5,1)' }} />}
        </button>
      )}

      <button onClick={() => onView?.(meal)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        {hasPhoto ? (
          <div className="shrink-0" style={{ width: 50, height: 50, borderRadius: 15, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <img src={photo} alt="" onError={() => setImgOk(false)} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex items-center justify-center shrink-0"
            style={{ width: 46, height: 46, borderRadius: 14, background: accent ? 'var(--accent-light)' : 'var(--surface)', fontSize: 21, boxShadow: 'var(--shadow-sm)' }}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: accent ? 'var(--accent-text)' : 'var(--text-3)' }}>
            {subtitle}
          </p>
          <p className="font-display font-bold truncate"
            style={{ fontSize: 15, letterSpacing: '-0.01em', color: 'var(--text)', textDecoration: prepped ? 'line-through' : 'none', textDecorationColor: 'var(--text-3)' }}>
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
