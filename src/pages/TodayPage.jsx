import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanStore } from '../hooks/usePlanStore'
import { useMeals } from '../hooks/useMeals'
import { useAuth } from '../hooks/useAuth'
import { CATEGORIES } from '../lib/mealLogic'
import { getMealFacts, formatPrepTime } from '../lib/mealFacts'
import { getTodayIndex } from '../lib/weekDates'
import { computeStreak, currentWeekDays, recordCookedToday } from '../lib/streak'
import RecipeDetailModal from '../components/RecipeDetailModal'
import {
  Flame, Clock, ShoppingCart, CalendarDays, Sparkles,
  Check, ChefHat, Snowflake, Trophy, PartyPopper,
} from 'lucide-react'

const CAT_ICONS = { Breakfast: '🍳', Lunch: '🥗', Dinner: '🍝', Snack: '🍎' }
const CAT_COLOR = {
  Breakfast: { edge: '#D9A12E', tint: 'rgba(217,161,46,0.12)' },
  Lunch:     { edge: 'var(--accent)', tint: 'var(--accent-light)' },
  Dinner:    { edge: 'var(--brand)', tint: 'var(--surface-3)' },
  Snack:     { edge: '#7C9CB5', tint: 'rgba(124,156,181,0.12)' },
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TodayPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { weeklyPlan, servings, isPrepDone, togglePrep } = usePlanStore()
  const { meals: allMeals, toggleFavorite } = useMeals()

  const todayIdx = useMemo(() => { const t = getTodayIndex(); return t >= 0 ? t : 0 }, [])
  const [viewMeal, setViewMeal] = useState(null)
  const [showStreak, setShowStreak] = useState(false)
  const [streak, setStreak] = useState(() => computeStreak())
  const [weekDays, setWeekDays] = useState(() => currentWeekDays())

  // Today's meals from the plan, overlaid with live meal data by id.
  const todayMeals = useMemo(() => {
    const day = weeklyPlan?.[todayIdx] || {}
    const byId = new Map((allMeals || []).map(m => [m.id, m]))
    return CATEGORIES.map(cat => {
      const meal = day[cat]
      if (!meal) return { category: cat, meal: null }
      const live = byId.get(meal.id)
      return { category: cat, meal: live ? { ...live, ...meal } : meal }
    })
  }, [weeklyPlan, todayIdx, allMeals])

  const planned = todayMeals.filter(m => m.meal)
  const doneCount = planned.filter(m => isPrepDone(todayIdx, m.category)).length
  const totalCount = planned.length
  const nextUp = planned.find(m => !isPrepDone(todayIdx, m.category))
  const caloriesSoFar = planned
    .filter(m => isPrepDone(todayIdx, m.category))
    .reduce((s, m) => s + (getMealFacts(m.meal, servings).calories || 0), 0)

  // Recompute streak whenever prep changes: if any meal is done today, today counts.
  useEffect(() => {
    const cookedToday = planned.some(m => isPrepDone(todayIdx, m.category))
    const h = recordCookedToday(cookedToday)
    setStreak(computeStreak(h))
    setWeekDays(currentWeekDays(h))
  }, [weeklyPlan, todayIdx, doneCount]) // eslint-disable-line

  const name = profile?.full_name?.split(' ')[0] || ''
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  function handleStartCooking(meal) {
    // Open the recipe; Cook Mode can hook in here later.
    setViewMeal({ meal, dayIdx: todayIdx, category: nextUp?.category })
  }

  const circumference = 2 * Math.PI * 17

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28 pt-4 sm:pt-6">

      {/* Header row: date + streak */}
      <div className="flex items-center justify-between mb-1">
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>
          {dateLabel}
        </p>
        <button onClick={() => setShowStreak(true)}
          className="flex items-center gap-1.5 tap-target"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 11px', boxShadow: 'var(--shadow-sm)' }}>
          <Flame size={14} style={{ color: streak.current > 0 ? '#E8730C' : 'var(--text-3)' }} />
          <span className="nums" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{streak.current}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>day{streak.current === 1 ? '' : 's'}</span>
        </button>
      </div>
      <h1 className="font-display font-bold mb-4" style={{ fontSize: 27, letterSpacing: '-0.03em', color: 'var(--text)' }}>
        {greeting()}{name ? `, ${name}` : ''}
      </h1>

      {totalCount === 0 ? (
        <EmptyToday onGenerate={() => navigate('/planner')} />
      ) : (
        <>
          {/* Up-next hero, or all-done celebration */}
          {nextUp ? (
            <div className="rounded-[18px] p-4 mb-3.5" style={{ background: 'var(--brand)', boxShadow: 'var(--shadow-brand)' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                  Up next · {nextUp.category}
                </span>
                {getMealFacts(nextUp.meal, servings).prepTime != null && (
                  <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                    <Clock size={11} /> {formatPrepTime(getMealFacts(nextUp.meal, servings).prepTime)}
                  </span>
                )}
              </div>
              <p className="font-display font-bold" style={{ fontSize: 21, letterSpacing: '-0.02em', color: '#fff', margin: '6px 0 14px' }}>
                {nextUp.meal.item_name}
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => handleStartCooking(nextUp.meal)}
                  className="flex-1 flex items-center justify-center gap-2 tap-target font-display font-bold"
                  style={{ background: 'var(--accent)', color: '#1A1C16', fontSize: 14, padding: 11, borderRadius: 12 }}>
                  <ChefHat size={16} /> Start cooking
                </button>
                <button onClick={() => setViewMeal({ meal: nextUp.meal, dayIdx: todayIdx, category: nextUp.category })}
                  className="tap-target font-display font-semibold"
                  style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, padding: '11px 16px', borderRadius: 12 }}>
                  Recipe
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] p-5 mb-3.5 text-center" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
              <PartyPopper size={34} style={{ color: 'var(--accent-text)', margin: '0 auto' }} />
              <p className="font-display font-bold" style={{ fontSize: 18, color: 'var(--accent-text)', marginTop: 6 }}>All done for today!</p>
              <p style={{ fontSize: 13, color: 'var(--accent-text)', marginTop: 3 }}>You cooked everything you planned. Nice work.</p>
            </div>
          )}

          {/* Progress ring */}
          <div className="card p-3 mb-4 flex items-center gap-3">
            <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
              <svg width="42" height="42" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="21" cy="21" r="17" fill="none" stroke="var(--surface-2)" strokeWidth="4" />
                <circle cx="21" cy="21" r="17" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - (totalCount ? doneCount / totalCount : 0))}
                  style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="nums font-display font-bold" style={{ fontSize: 12, color: 'var(--text)' }}>{doneCount}/{totalCount}</span>
              </div>
            </div>
            <div>
              <p className="font-display font-bold" style={{ fontSize: 14, color: 'var(--text)' }}>Meals done</p>
              <p className="nums" style={{ fontSize: 11, color: 'var(--text-3)' }}>{caloriesSoFar.toLocaleString()} cal so far</p>
            </div>
          </div>

          {/* Today's meals */}
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', margin: '0 4px 9px' }}>
            Today's meals
          </p>
          <div className="flex flex-col gap-2 mb-4">
            {planned.map(({ category, meal }) => {
              const done = isPrepDone(todayIdx, category)
              const facts = getMealFacts(meal, servings)
              const col = CAT_COLOR[category]
              return (
                <div key={category} className="card flex items-center gap-3 p-2.5" style={{ opacity: done ? 0.62 : 1, transition: 'opacity 0.2s' }}>
                  <button onClick={() => togglePrep(todayIdx, category)}
                    aria-label={done ? 'Mark not cooked' : 'Mark cooked'}
                    className="flex items-center justify-center tap-target shrink-0 transition-all active:scale-90"
                    style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${done ? 'var(--accent)' : 'var(--border-2)'}`, background: done ? 'var(--accent)' : 'transparent' }}>
                    {done && <Check size={15} strokeWidth={2.6} style={{ color: '#1A1C16' }} />}
                  </button>
                  <button onClick={() => setViewMeal({ meal, dayIdx: todayIdx, category })} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 9, background: col.tint, fontSize: 16 }}>
                      {CAT_ICONS[category]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{category}</p>
                      <p className="font-display font-semibold truncate" style={{ fontSize: 14, color: 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                        {meal.item_name}
                      </p>
                    </div>
                    {facts.calories != null && (
                      <span className="nums shrink-0" style={{ fontSize: 11, color: 'var(--text-3)' }}>{facts.calories}</span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2.5">
            {[
              { icon: ShoppingCart, label: 'Grocery', to: '/grocery' },
              { icon: CalendarDays, label: 'Full week', to: '/planner' },
              { icon: Sparkles, label: 'Regenerate', to: '/planner' },
            ].map(({ icon: Icon, label, to }) => (
              <button key={label} onClick={() => navigate(to)} className="card flex-1 flex flex-col items-center gap-1.5 py-3 tap-target transition-all active:scale-95">
                <Icon size={18} style={{ color: 'var(--text-2)' }} />
                <span className="font-display font-semibold" style={{ fontSize: 12.5, color: 'var(--text)' }}>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {showStreak && <StreakSheet streak={streak} weekDays={weekDays} onClose={() => setShowStreak(false)} />}

      {viewMeal && (
        <RecipeDetailModal
          meal={allMeals.find(m => m.id === viewMeal.meal?.id) || viewMeal.meal}
          onClose={() => setViewMeal(null)}
          onToggleFavorite={(m) => m.id && toggleFavorite(m.id, m.is_favorite)}
        />
      )}
    </div>
  )
}

function EmptyToday({ onGenerate }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center">
      <div style={{ fontSize: 44 }}>🍽️</div>
      <p className="font-display font-bold" style={{ fontSize: 18, color: 'var(--text)', marginTop: 10 }}>Nothing planned for today</p>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 5, maxWidth: 260, lineHeight: 1.5 }}>
        Head to the planner to generate your week — then today's meals show up right here.
      </p>
      <button onClick={onGenerate} className="btn-primary btn tap-target gap-2 mt-5">
        <Sparkles size={16} /> Plan my week
      </button>
    </div>
  )
}

function StreakSheet({ streak, weekDays, onClose }) {
  const toBeat = Math.max(0, streak.best - streak.current)
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 modal-safe"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm card p-6" style={{ animation: 'modalIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="text-center mb-5">
          <Flame size={46} style={{ color: '#E8730C', margin: '0 auto' }} />
          <p className="font-display font-extrabold" style={{ fontSize: 34, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1, marginTop: 4 }}>
            {streak.current} day{streak.current === 1 ? '' : 's'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 5 }}>
            {streak.current > 0 ? "You've been cooking consistently. Keep it going!" : 'Cook a meal today to start a streak.'}
          </p>
        </div>

        {/* Week dots */}
        <div className="flex gap-1.5 justify-center mb-5">
          {weekDays.map((d, i) => {
            const frozen = !d.cooked && !d.isFuture && !d.isToday
            return (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center" style={{
                  width: 36, height: 36, borderRadius: 11, fontSize: 15,
                  background: d.cooked ? 'var(--accent)' : frozen ? 'rgba(124,156,181,0.15)' : 'var(--surface-2)',
                  border: `1px solid ${d.cooked ? 'var(--accent)' : frozen ? '#7C9CB5' : 'var(--border)'}`,
                  opacity: d.isFuture ? 0.4 : 1,
                }}>
                  {d.cooked ? <Check size={15} strokeWidth={2.6} style={{ color: '#1A1C16' }} /> : frozen ? <Snowflake size={14} style={{ color: '#7C9CB5' }} /> : ''}
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{d.label}</p>
              </div>
            )
          })}
        </div>

        {/* Freeze explainer */}
        <div className="card flex items-center gap-3 p-3 mb-2.5" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
          <Snowflake size={20} style={{ color: '#7C9CB5', flexShrink: 0 }} />
          <div>
            <p className="font-display font-semibold" style={{ fontSize: 13.5, color: 'var(--text)' }}>Busy days are covered</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.4 }}>
              You get 2 freeze days a week — a missed day won't break your streak.
            </p>
          </div>
        </div>

        {/* Personal best */}
        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
          <Trophy size={20} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
          <div>
            <p className="font-display font-semibold" style={{ fontSize: 13.5, color: 'var(--accent-text)' }}>Personal best: {streak.best} day{streak.best === 1 ? '' : 's'}</p>
            <p style={{ fontSize: 11.5, color: 'var(--accent-text)' }}>
              {toBeat > 0 ? `${toBeat} to go to beat your record.` : "You're at your best ever — keep going!"}
            </p>
          </div>
        </div>

        <button onClick={onClose} className="btn-ghost btn w-full tap-target mt-4">Done</button>
      </div>
    </div>
  )
}
