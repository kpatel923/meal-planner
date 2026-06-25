import { useState } from 'react'
import { DIET_LABELS, isEatingOut } from '../../lib/mealLogic'
import { nutritionColor } from '../../lib/nutrition'
import { getMealFacts, formatPrepTime } from '../../lib/mealFacts'
import { tapHaptic } from '../../lib/haptics'
import {
  Check, ArrowLeftRight, ChevronRight, Flame, Plus, Leaf, Clock, DollarSign, MoveRight,
} from 'lucide-react'

// Per-category visual identity. Uses the app's existing token palette so it
// stays on-brand in both light and dark themes.
const CAT_STYLES = {
  Breakfast: { accent: '#D9A12E', tint: 'rgba(217,161,46,0.14)',  icon: '🍳' },
  Lunch:     { accent: 'var(--accent)', tint: 'var(--accent-light)', icon: '🥗' },
  Dinner:    { accent: 'var(--brand)', tint: 'var(--brand-light)',  icon: '🍝' },
  Snack:     { accent: '#7A8C5A', tint: 'rgba(122,140,90,0.14)',   icon: '🍎' },
}

/**
 * A single meal row in the day view. Self-contained, memo-friendly.
 * Falls back to an "add" affordance when `meal` is null.
 */
export default function MealCard({
  meal, category, prepped, onTogglePrep, onSwap, onView, onAdd, onMove, animDelay = 0,
}) {
  const style = CAT_STYLES[category] || CAT_STYLES.Breakfast
  const [justChecked, setJustChecked] = useState(false)

  if (!meal) {
    return (
      <button
        onClick={() => onAdd?.(category)}
        className="meal-row-in w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all tap-target text-left"
        style={{
          border: '1px dashed var(--border-2)',
          background: 'transparent',
          color: 'var(--text-3)',
          animationDelay: `${animDelay}ms`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
      >
        <Plus size={16} />
        <span style={{ fontSize: '13px' }}>Add {category.toLowerCase()}</span>
      </button>
    )
  }

  const facts = getMealFacts(meal, 1)
  const prepLabel = formatPrepTime(facts.prepTime)
  const diet = DIET_LABELS[meal.diet_type]
  const eatingOut = isEatingOut(meal)

  function handleToggle(e) {
    e.stopPropagation()
    if (!prepped) { setJustChecked(true); setTimeout(() => setJustChecked(false), 360) }
    onTogglePrep?.()
    tapHaptic()
  }

  return (
    <div
      onClick={() => onView?.(meal)}
      className="meal-row-in relative flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        opacity: prepped ? 0.5 : 1,
        transition: 'opacity 0.25s ease, transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease, border-color 0.18s ease',
        animationDelay: `${animDelay}ms`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'var(--border-2)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(22,22,20,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <span className="meal-accent" style={{ background: style.accent }} />

      <div className="shrink-0 flex items-center justify-center rounded-xl"
        style={{ width: 40, height: 40, background: style.tint, fontSize: 18 }}>
        {style.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: style.accent }}>
            {category}
          </span>
        </div>
        <p className="truncate" style={{
          fontSize: 13.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3,
          textDecoration: prepped ? 'line-through' : 'none',
        }}>
          {meal.item_name}
        </p>
        <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 4 }}>
          {eatingOut ? (
            <span className="flex items-center gap-1" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--brand-text)' }}>
              🍴 No cooking tonight
            </span>
          ) : (
            <>
              {facts.calories != null && (
                <span className="nums flex items-center gap-1" style={{ fontSize: 10.5, fontWeight: 600, color: nutritionColor(facts.calories) }}>
                  <Flame size={10} /> {facts.calories} cal
                </span>
              )}
              {prepLabel && (
                <span className="nums flex items-center gap-1" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                  <Clock size={10} /> {prepLabel}
                </span>
              )}
              {facts.cost != null && (
                <span className="nums flex items-center gap-1" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                  <DollarSign size={10} /> {facts.cost.toFixed(2)}
                </span>
              )}
              {diet && (
                <span className="flex items-center gap-1" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                  <Leaf size={10} /> {diet.label}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleToggle}
          title={prepped ? 'Mark not prepped' : 'Mark prepped'}
          aria-label={prepped ? 'Mark not prepped' : 'Mark prepped'}
          className={`flex items-center justify-center rounded-lg transition-all tap-target ${justChecked ? 'check-pop' : ''}`}
          style={{
            width: 32, height: 32,
            background: prepped ? 'var(--success-light)' : 'transparent',
            color: prepped ? 'var(--success)' : 'var(--text-3)',
          }}
          onMouseEnter={e => { if (!prepped) e.currentTarget.style.background = 'var(--surface-2)' }}
          onMouseLeave={e => { if (!prepped) e.currentTarget.style.background = 'transparent' }}
        >
          <Check size={16} strokeWidth={prepped ? 2.6 : 2} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onSwap?.(category) }}
          title="Swap meal" aria-label="Swap meal"
          className="flex items-center justify-center rounded-lg transition-all tap-target"
          style={{ width: 32, height: 32, color: 'var(--text-3)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
        >
          <ArrowLeftRight size={15} />
        </button>
        {onMove && (
          <button
            onClick={e => { e.stopPropagation(); onMove(category) }}
            title="Move meal" aria-label="Move meal to another day"
            className="flex items-center justify-center rounded-lg transition-all tap-target"
            style={{ width: 32, height: 32, color: 'var(--text-3)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
          >
            <MoveRight size={15} />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onView?.(meal) }}
          title="View recipe" aria-label="View recipe"
          className="flex items-center justify-center rounded-lg transition-all tap-target"
          style={{ width: 30, height: 32, color: 'var(--text-3)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  )
}
