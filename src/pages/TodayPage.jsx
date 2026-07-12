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
import CookMode from '../components/CookMode'
import MealRow from '../components/ui/MealRow'
import SectionLabel from '../components/ui/SectionLabel'
import ProgressRing from '../components/ui/ProgressRing'
import { useCountUp } from '../hooks/useCountUp'
import {
  Flame, Clock, Sparkles, CalendarDays,
  Snowflake, Trophy, PartyPopper, Check, BookOpen, Plus,
} from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TodayPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { weeklyPlan, servings, isPrepDone, togglePrep, removeDessert } = usePlanStore()
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

  // Optional dessert lives under the 'Dessert' key (outside CATEGORIES).
  const todayDessert = useMemo(() => {
    const d = weeklyPlan?.[todayIdx]?.Dessert
    if (!d) return null
    const live = (allMeals || []).find(m => m.id === d.id)
    return live ? { ...live, ...d } : d
  }, [weeklyPlan, todayIdx, allMeals])

  // Pick the meal to feature based on time of day, falling back sensibly.
  // Morning → Breakfast, midday → Lunch, evening → Dinner; Snack is a filler.
  const featured = useMemo(() => {
    const byCat = {}
    planned.forEach(m => { byCat[m.category] = m })
    const h = new Date().getHours()
    let order
    if (h < 11) order = ['Breakfast', 'Lunch', 'Snack', 'Dinner']
    else if (h < 15) order = ['Lunch', 'Snack', 'Dinner', 'Breakfast']
    else if (h < 21) order = ['Dinner', 'Snack', 'Lunch', 'Breakfast']
    else order = ['Snack', 'Dinner', 'Lunch', 'Breakfast']
    // Prefer the time-appropriate meal that isn't cooked yet; if it's done,
    // still feature it (shows as done) rather than jumping to an odd meal.
    for (const cat of order) {
      const m = byCat[cat]
      if (m && !isPrepDone(todayIdx, cat)) return m
    }
    // Everything in-order is cooked — return the time-appropriate one anyway,
    // or null if truly nothing planned.
    for (const cat of order) { if (byCat[cat]) return m0(byCat[cat]) }
    return null
    function m0(x) { return x }
  }, [planned, todayIdx, isPrepDone])

  const allDone = totalCount > 0 && doneCount === totalCount
  // Feature the time-appropriate meal; if it's cooked, fall back to any
  // remaining uncooked meal so the hero only turns into the celebration when
  // EVERYTHING is done.
  const nextUp = useMemo(() => {
    if (allDone) return null
    if (featured && !isPrepDone(todayIdx, featured.category)) return featured
    return planned.find(m => !isPrepDone(todayIdx, m.category)) || null
  }, [featured, allDone, planned, todayIdx, isPrepDone])
  const caloriesSoFar = planned
    .filter(m => isPrepDone(todayIdx, m.category))
    .reduce((s, m) => s + (getMealFacts(m.meal, servings).calories || 0), 0)
    + (todayDessert && isPrepDone(todayIdx, 'Dessert') ? (getMealFacts(todayDessert, servings).calories || 0) : 0)
  const totalCals = planned.reduce((s, m) => s + (getMealFacts(m.meal, servings).calories || 0), 0)
    + (todayDessert ? (getMealFacts(todayDessert, servings).calories || 0) : 0)
  const animatedCals = useCountUp(caloriesSoFar)

  // Recompute streak whenever prep changes: if any meal is done today, today counts.
  useEffect(() => {
    const cookedToday = planned.some(m => isPrepDone(todayIdx, m.category))
    const h = recordCookedToday(cookedToday)
    setStreak(computeStreak(h))
    setWeekDays(currentWeekDays(h))
  }, [weeklyPlan, todayIdx, doneCount]) // eslint-disable-line

  const name = profile?.full_name?.split(' ')[0] || ''
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  const [cookMeal, setCookMeal] = useState(null)
  function handleStartCooking(meal) {
    setCookMeal(meal)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28 pt-4 sm:pt-6">

      {/* Header row: date + streak */}
      <div className="flex items-center justify-between mb-1">
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>
          {dateLabel}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/planner')}
            className="flex items-center gap-1.5 tap-target transition-all active:scale-95"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 12px', boxShadow: 'var(--shadow-sm)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
            <CalendarDays size={13} /> Full week
          </button>
          <button onClick={() => setShowStreak(true)}
            className="flex items-center gap-1.5 tap-target"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 11px', boxShadow: 'var(--shadow-sm)' }}>
            <Flame size={14} style={{ color: streak.current > 0 ? '#E8730C' : 'var(--text-3)' }} />
            <span className="nums" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{streak.current}</span>
          </button>
        </div>
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
            <div className="rounded-[20px] p-4 mb-3.5" style={{ background: '#1A1C16', boxShadow: 'var(--shadow-lg)', border: '1px solid #2A2D24', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(124,181,24,0.08)' }} />
              <div className="flex items-center justify-between" style={{ position: 'relative' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9BD531' }}>
                  Up next · {nextUp.category}
                </span>
                <div className="flex items-center gap-2.5">
                  {getMealFacts(nextUp.meal, servings).prepTime != null && (
                    <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      <Clock size={12} /> {formatPrepTime(getMealFacts(nextUp.meal, servings).prepTime)}
                    </span>
                  )}
                  {getMealFacts(nextUp.meal, servings).calories != null && (
                    <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      <Flame size={12} /> {getMealFacts(nextUp.meal, servings).calories}
                    </span>
                  )}
                </div>
              </div>
              <p className="font-display font-bold" style={{ fontSize: 22, letterSpacing: '-0.02em', color: '#fff', margin: '7px 0 15px', position: 'relative' }}>
                {nextUp.meal.item_name}
              </p>
              <div className="flex gap-2.5" style={{ position: 'relative' }}>
                <button onClick={() => handleStartCooking(nextUp.meal)}
                  className="flex items-center justify-center gap-2 tap-target font-display font-bold transition-all active:scale-[0.98]"
                  style={{ flex: 1.4, background: '#9BD531', color: '#1A1C16', fontSize: 14, padding: 12, borderRadius: 13 }}>
                  <Flame size={17} /> Cook now
                </button>
                <button onClick={() => setViewMeal({ meal: nextUp.meal, dayIdx: todayIdx, category: nextUp.category })}
                  className="flex items-center justify-center gap-2 tap-target font-display font-semibold transition-all active:scale-[0.98]"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, padding: 12, borderRadius: 13, border: '1px solid rgba(255,255,255,0.12)' }}>
                  <BookOpen size={16} /> Recipe
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[20px] p-5 mb-3.5 text-center" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
              <PartyPopper size={36} style={{ color: 'var(--accent-text)', margin: '0 auto' }} />
              <p className="font-display font-bold" style={{ fontSize: 19, color: 'var(--accent-text)', marginTop: 6 }}>All done for today!</p>
              <p style={{ fontSize: 13, color: 'var(--accent-text)', marginTop: 3 }}>You cooked everything you planned. Nice work.</p>
            </div>
          )}

          {/* Progress card */}
          <div className="card mb-4 flex items-center gap-3" style={{ padding: '13px 15px' }}>
            <ProgressRing value={doneCount} max={totalCount || 1} size={48} stroke={5}
              label={`${doneCount}/${totalCount}`} labelColor="var(--text)" />
            <div className="flex-1">
              <p className="font-display font-bold" style={{ fontSize: 15, color: 'var(--text)' }}>Today's progress</p>
              <p className="nums" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {animatedCals.toLocaleString()} of {totalCals.toLocaleString()} cal
              </p>
            </div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: allDone ? 'var(--accent)' : 'var(--text)' }}>
              {Math.round((doneCount / (totalCount || 1)) * 100)}%
            </div>
          </div>

          {/* Today's meals */}
          <SectionLabel>Today's meals</SectionLabel>
          <div className="flex flex-col gap-2 mb-2">
            {planned.filter(m => m.category !== 'Dessert').map(({ category, meal }, i) => (
              <div key={category} style={{ animation: `cardStagger 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms both` }}>
                <MealRow
                  meal={meal}
                  category={category}
                  servings={servings}
                  prepped={isPrepDone(todayIdx, category)}
                  onTogglePrep={() => togglePrep(todayIdx, category)}
                  onView={(m) => setViewMeal({ meal: m, dayIdx: todayIdx, category })}
                />
              </div>
            ))}
          </div>

          {/* Dessert — a first-class slot (opt-in; add from the planner) */}
          {todayDessert ? (
            <MealRow
              meal={todayDessert}
              category="Dessert"
              servings={servings}
              prepped={isPrepDone(todayIdx, 'Dessert')}
              onTogglePrep={() => togglePrep(todayIdx, 'Dessert')}
              onView={(m) => setViewMeal({ meal: m, dayIdx: todayIdx, category: 'Dessert' })}
              onRemove={() => removeDessert(todayIdx)}
              accent
            />
          ) : (
            <button onClick={() => navigate('/planner')}
              className="w-full flex items-center gap-3.5 tap-target transition-all active:scale-[0.99] mb-4"
              style={{ padding: '13px 15px', borderRadius: 18, border: '1.5px dashed var(--accent)', background: 'transparent' }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 9, border: '2px dashed var(--accent)', color: 'var(--accent-dark)' }}>
                <Plus size={15} />
              </span>
              <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--accent-light)', fontSize: 20 }}>
                🍰
              </span>
              <div className="text-left">
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>Dessert</p>
                <p className="font-display font-semibold" style={{ fontSize: 15, color: 'var(--text-2)' }}>Add a dessert</p>
              </div>
            </button>
          )}
        </>
      )}

      {cookMeal && (
        <CookMode
          meal={cookMeal}
          onClose={() => setCookMeal(null)}
          onDone={() => {
            // Mark the featured meal's slot as cooked when they finish.
            const slot = nextUp?.category || planned.find(p => p.meal?.id === cookMeal.id)?.category
            if (slot && !isPrepDone(todayIdx, slot)) togglePrep(todayIdx, slot)
          }}
        />
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
                  border: `1px solid ${d.cooked ? 'var(--accent)' : frozen ? '#8A94A6' : 'var(--border)'}`,
                  opacity: d.isFuture ? 0.4 : 1,
                }}>
                  {d.cooked ? <Check size={15} strokeWidth={2.6} style={{ color: '#1A1C16' }} /> : frozen ? <Snowflake size={14} style={{ color: '#8A94A6' }} /> : ''}
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{d.label}</p>
              </div>
            )
          })}
        </div>

        {/* Freeze explainer */}
        <div className="card flex items-center gap-3 p-3 mb-2.5" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
          <Snowflake size={20} style={{ color: '#8A94A6', flexShrink: 0 }} />
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
