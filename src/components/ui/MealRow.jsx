import { Check, X, ChevronRight } from 'lucide-react'
import StatPill from './StatPill'
import { getMealFacts } from '../../lib/mealFacts'
import { successHaptic, tapHaptic } from '../../lib/haptics'

const CAT_ICONS = { Breakfast: '🍳', Lunch: '🥗', Dinner: '🍝', Snack: '🍎', Dessert: '🍰' }

// One canonical meal row. Used on Today, Planner, and anywhere a planned meal
// is listed. Tap opens detail (onView); optional prep-check and remove.
export default function MealRow({
  meal, category, servings = 1,
  prepped = false, onTogglePrep,
  onView, onRemove,
  accent = false,          // lime-accented border (used for dessert)
  showChevron = false,
}) {
  if (!meal) return null
  const facts = getMealFacts(meal, servings)
  const icon = CAT_ICONS[category] || '🍽️'

  function handleCheck(e) {
    e.stopPropagation()
    if (!prepped) successHaptic(); else tapHaptic()
    onTogglePrep?.()
  }

  return (
    <div className="card flex items-center gap-3"
      style={{
        padding: '10px 12px',
        border: accent ? '1px solid var(--accent)' : undefined,
        opacity: prepped ? 0.6 : 1,
        transition: 'opacity 0.25s ease',
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
        <div className="flex items-center justify-center shrink-0"
          style={{ width: 36, height: 36, borderRadius: 10, background: accent ? 'var(--accent-light)' : 'var(--surface-2)', fontSize: 17 }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: accent ? 'var(--accent-text)' : 'var(--text-3)' }}>
            {category}
          </p>
          <p className="font-display font-semibold truncate"
            style={{ fontSize: 14.5, color: 'var(--text)', textDecoration: prepped ? 'line-through' : 'none', textDecorationColor: 'var(--text-3)' }}>
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
      {showChevron && !onRemove && (
        <ChevronRight size={17} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      )}
    </div>
  )
}
