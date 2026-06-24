import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { usePlans } from '../hooks/usePlans'
import { useAuth } from '../hooks/useAuth'
import { usePlanStore } from '../hooks/usePlanStore'
import { DAYS, CATEGORIES, makeEatingOutMeal, isEatingOut } from '../lib/mealLogic'
import { exportToPDF } from '../lib/pdfExport'
import {
  buildPlanShareText, buildGroceryShareText, buildShareableURL, shareText,
} from '../lib/sharing'
import { buildGroceryList } from '../lib/mealLogic'
import { generatePlanDescription } from '../lib/aiFeatures'
import { weeklyNutritionTotals, nutritionColor } from '../lib/nutrition'
import { getMealFacts, formatPrepTime } from '../lib/mealFacts'
import { formatCost } from '../lib/budget'
import { getWeekDates, getTodayIndex, formatWeekRange } from '../lib/weekDates'
import RecipeDetailModal from '../components/RecipeDetailModal'
import DayStrip from '../components/planner/DayStrip'
import MealCard from '../components/planner/MealCard'
import MobileSheet from '../components/planner/MobileSheet'
import {
  WeekOverview, GroceryPreview, AIPrompts, QuickActions, PanelSection,
} from '../components/planner/PlannerPanels'
import {
  Save, Loader2, Sparkles, X, ArrowLeftRight, RotateCcw,
  Share2, Link as LinkIcon, Undo2, Wand2, Users,
  CalendarPlus, RefreshCw, BarChart3,
  ShoppingCart, MoreHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'

const CAT_STYLES = {
  Breakfast: { accent: '#D9892E', icon: '🍳' },
  Lunch:     { accent: 'var(--success)', icon: '🥗' },
  Dinner:    { accent: 'var(--brand)', icon: '🍝' },
  Snack:     { accent: '#8B5FBF', icon: '🍎' },
}

const DIET_FILTERS = [
  { key: 'veg',    label: 'Veg',     color: 'var(--success)' },
  { key: 'vegan',  label: 'Vegan',   color: 'var(--success)' },
  { key: 'nonveg', label: 'Non-Veg', color: 'var(--danger)' },
]

export default function PlannerPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const {
    weeklyPlan, generating, dietTypes, servings, avoidRepeats,
    undoStack, prevPlanSnapshot, planDesc,
    setDietTypes, setServings, setAvoidRepeats, setPlanDesc,
    generate, regenerateDay, swapMeal, undoSwap, clearUndo,
    undoGenerate, clearUndoGenerate,
    clearPlan, togglePrep, isPrepDone, prepProgress,
  } = usePlanStore()
  const { savePlan } = usePlans()

  // ── Local UI state ────────────────────────────────────────────────
  const [activeDay,      setActiveDay]      = useState(() => {
    const t = getTodayIndex(); return t >= 0 ? t : 0
  })
  const [planName,       setPlanName]       = useState('')
  const [saving,         setSaving]         = useState(false)
  const [confirmRegen,   setConfirmRegen]   = useState(false)
  const [swapTarget,     setSwapTarget]     = useState(null)
  const [swapSearch,     setSwapSearch]     = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareType,      setShareType]      = useState('plan')
  const [loadingDesc,    setLoadingDesc]    = useState(false)
  const [regenDay,       setRegenDay]       = useState(null)
  const [viewMeal,       setViewMeal]       = useState(null)
  const [showControls,   setShowControls]   = useState(false)
  const [mobileSheet,    setMobileSheet]    = useState(null) // 'overview' | 'grocery' | 'ai' | 'actions' | null

  // Single meals fetch — filter client-side instead of a second query.
  const { meals: allMeals, loading: mealsLoading } = useMeals()
  const filteredMeals = useMemo(
    () => allMeals.filter(m => dietTypes.includes(m.diet_type)),
    [allMeals, dietTypes],
  )

  const weekDates = useMemo(() => getWeekDates(), [])
  const todayIdx = useMemo(() => getTodayIndex(), [])

  // Keep the active day valid if a plan loads/clears.
  useEffect(() => {
    if (activeDay < 0 || activeDay > 6) setActiveDay(0)
  }, [activeDay])

  function toggleDiet(key) {
    setDietTypes(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key])
  }

  async function handleGenerate() {
    if (!dietTypes.length) { toast.error('Select at least one diet type'); return }
    if (weeklyPlan && !confirmRegen) { setConfirmRegen(true); return }
    setConfirmRegen(false)
    try {
      const plan = await generate(filteredMeals, user?.id, profile?.budget_mode || false)
      toast.success('Week generated!')
      setActiveDay(todayIdx >= 0 ? todayIdx : 0)
      fetchAIDescription(plan)
    } catch {
      toast.error('Not enough meals — add more recipes first.')
    }
  }

  async function handleRegenerateDay(dayIdx) {
    setRegenDay(dayIdx)
    await new Promise(r => setTimeout(r, 350))
    regenerateDay(dayIdx, filteredMeals, profile?.budget_mode || false)
    setRegenDay(null)
    toast.success(`${DAYS[dayIdx]} refreshed!`)
  }

  async function fetchAIDescription(plan, isManualRetry = false) {
    if (!plan) return
    setLoadingDesc(true)
    try {
      const desc = await generatePlanDescription(plan, DAYS, CATEGORIES)
      setPlanDesc(desc)
    } catch (e) {
      if (isManualRetry) toast.error(e.message || 'Could not generate summary', { duration: 5000 })
    }
    setLoadingDesc(false)
  }

  async function handleSave() {
    if (!weeklyPlan || !planName.trim()) { toast.error('Give this plan a name first'); return }
    setSaving(true)
    await savePlan(planName.trim(), weeklyPlan)
    setPlanName('')
    setSaving(false)
  }

  function openSwap(dayIdx, category) { setSwapTarget({ dayIdx, category }); setSwapSearch('') }
  function closeSwap() { setSwapTarget(null); setSwapSearch('') }

  function handleSwapSelect(meal) {
    if (!swapTarget) return
    const wasEmpty = !weeklyPlan?.[swapTarget.dayIdx]?.[swapTarget.category]
    swapMeal(swapTarget.dayIdx, swapTarget.category, meal)
    if (wasEmpty) toast.success(`Added ${meal.item_name}`, { icon: '➕' })
    // For a true swap, the persistent UndoToast bar handles confirmation + undo.
    closeSwap()
  }

  function handleEatingOut() {
    if (!swapTarget) return
    swapMeal(swapTarget.dayIdx, swapTarget.category, makeEatingOutMeal(swapTarget.category))
    toast.success('Marked as eating out', { icon: '🍴' })
    closeSwap()
  }

  function handleShare(type) { setShareType(type); setShowShareModal(true) }

  const swapMeals = swapTarget
    ? allMeals.filter(m =>
        m.category === swapTarget.category &&
        m.item_name.toLowerCase().includes(swapSearch.toLowerCase()))
    : []

  const stats = useMemo(() => {
    if (!weeklyPlan) return null
    const ings = new Set()
    let count = 0
    Object.values(weeklyPlan).forEach(day => Object.values(day).forEach(meal => {
      if (!meal) return
      count++
      meal.ingredients?.split(',').forEach(i => ings.add(i.trim().toLowerCase()))
    }))
    return { count, ingredients: ings.size }
  }, [weeklyPlan])

  const { perDay } = useMemo(
    () => weeklyNutritionTotals(weeklyPlan, servings),
    [weeklyPlan, servings],
  )

  // Per-day nutrition for the active-day banner. MUST stay above any early
  // return so the hook order is identical on every render.
  const activeDayNutrition = useMemo(() => {
    if (!weeklyPlan?.[activeDay]) return null
    return weeklyNutritionTotals({ 0: weeklyPlan[activeDay] }, servings).perDay
  }, [weeklyPlan, activeDay, servings])

  // Active-day time + cost totals for the day-header highlight line.
  const activeDayFacts = useMemo(() => {
    const day = weeklyPlan?.[activeDay]
    if (!day) return { minutes: 0, hasTime: false, cost: 0 }
    let minutes = 0, hasTime = false, cost = 0
    CATEGORIES.forEach(cat => {
      const meal = day[cat]
      if (!meal) return
      const f = getMealFacts(meal, servings)
      if (f.prepTime != null) { minutes += f.prepTime; hasTime = true }
      if (f.cost != null) cost += f.cost * servings
    })
    return { minutes, hasTime, cost }
  }, [weeklyPlan, activeDay, servings])

  // ── Loading skeleton ──────────────────────────────────────────────
  if (mealsLoading) {
    return (
      <div className="px-5 sm:px-8 lg:px-10 py-8 space-y-3 mx-auto" style={{ maxWidth: 1100 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton rounded-2xl" style={{ height: 64, animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    )
  }

  const dayMeals = weeklyPlan?.[activeDay] || {}
  const dayPlanned = CATEGORIES.filter(c => dayMeals[c])
  const isToday = activeDay === todayIdx

  return (
    <div className="flex flex-col lg:flex-row" style={{ animation: 'fadeIn 0.3s ease-out', minHeight: '100%' }}>

      {/* ════════ MAIN COLUMN ════════ */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* ── Header bar ── */}
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="font-display font-semibold truncate" style={{ fontSize: 20, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                {weeklyPlan ? 'Your week' : 'Plan your week'}
              </h1>
              <span className="nums hidden sm:inline" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                {formatWeekRange(weekDates)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowControls(v => !v)}
                className="flex items-center gap-1.5 rounded-xl tap-target px-3"
                style={{ height: 36, border: '1px solid var(--border-2)', background: showControls ? 'var(--surface-2)' : 'transparent', color: 'var(--text-2)', fontSize: 12.5 }}
                title="Filters & options">
                <RefreshCw size={14} />
                <span className="hidden sm:inline">{dietTypes.map(d => DIET_FILTERS.find(f => f.key === d)?.label).filter(Boolean).join(' · ') || 'Filters'}</span>
              </button>

              {weeklyPlan && (
                <button onClick={() => handleShare('plan')}
                  className="flex items-center justify-center rounded-xl tap-target"
                  style={{ width: 36, height: 36, border: '1px solid var(--border-2)', color: 'var(--text-2)' }}
                  title="Share">
                  <Share2 size={16} />
                </button>
              )}

              {confirmRegen ? (
                <div className="flex items-center gap-2" style={{ animation: 'slideDown 0.2s ease' }}>
                  <span className="hidden sm:inline" style={{ fontSize: 13, color: 'var(--text-3)' }}>Overwrite?</span>
                  <button onClick={handleGenerate} className="btn-primary btn-sm btn">Yes</button>
                  <button onClick={() => setConfirmRegen(false)} className="btn-secondary btn-sm btn">No</button>
                </div>
              ) : (
                <button onClick={handleGenerate} disabled={generating || !dietTypes.length}
                  className="btn-primary btn tap-target gap-2" style={{ height: 36 }}>
                  {generating
                    ? <><Loader2 size={15} className="animate-[spin_1s_linear_infinite]" /> <span className="hidden sm:inline">Building…</span></>
                    : <><Wand2 size={15} /> <span className="hidden sm:inline">{weeklyPlan ? 'Regenerate' : 'Generate'}</span></>}
                </button>
              )}
            </div>
          </div>

          {/* Collapsible controls */}
          {showControls && (
            <div className="rounded-2xl mt-3 p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', animation: 'slideDown 0.22s ease both' }}>
              <div className="flex flex-col sm:flex-row gap-5 sm:items-end flex-wrap">
                <div>
                  <p className="input-label mb-2">Diet filter</p>
                  <div className="flex gap-2 flex-wrap">
                    {DIET_FILTERS.map(({ key, label, color }) => {
                      const active = dietTypes.includes(key)
                      return (
                        <button key={key} onClick={() => toggleDiet(key)}
                          className="px-3.5 py-2 rounded-full font-semibold transition-all active:scale-95 tap-target"
                          style={{ fontSize: 12.5, border: `2px solid ${active ? color : 'var(--border)'}`, background: active ? `${color}18` : 'transparent', color: active ? color : 'var(--text-3)' }}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="input-label mb-2 flex items-center gap-1.5"><Users size={11} /> Cooking for</p>
                  <div className="stepper">
                    <button onClick={() => setServings(servings - 1)} disabled={servings <= 1} className="stepper-btn" style={{ opacity: servings <= 1 ? 0.3 : 1 }}>−</button>
                    <span className="stepper-value">{servings}</span>
                    <button onClick={() => setServings(servings + 1)} disabled={servings >= 20} className="stepper-btn" style={{ opacity: servings >= 20 ? 0.3 : 1 }}>+</button>
                  </div>
                </div>
                <div>
                  <p className="input-label mb-2 flex items-center gap-1.5"><RefreshCw size={11} /> Avoid repeats</p>
                  <button onClick={() => setAvoidRepeats(v => !v)}
                    role="switch" aria-checked={avoidRepeats} aria-label="Avoid repeats"
                    className="relative rounded-full transition-all duration-300 shrink-0"
                    style={{ width: 52, height: 30, background: avoidRepeats ? 'var(--brand)' : 'var(--border-2)', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span className="absolute rounded-full bg-white shadow-md transition-transform duration-300"
                      style={{ width: 24, height: 24, top: 3, left: 3, transform: avoidRepeats ? 'translateX(22px)' : 'translateX(0)' }} />
                  </button>
                </div>
              </div>

              {weeklyPlan && (
                <div className="flex gap-2.5 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <input className="input flex-1" placeholder="Name this plan to save…"
                    value={planName} onChange={e => setPlanName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()} />
                  <button onClick={handleSave} disabled={saving || !planName.trim()} className="btn-primary btn gap-1.5">
                    {saving ? <Loader2 size={15} className="animate-[spin_1s_linear_infinite]" /> : <Save size={15} />} Save
                  </button>
                  <button onClick={clearPlan} className="btn-ghost btn btn-icon" title="Clear plan"><X size={16} /></button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Day strip ── */}
        {weeklyPlan && (
          <div className="px-3 sm:px-5 lg:px-7 pt-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <DayStrip
              weeklyPlan={weeklyPlan}
              activeDay={activeDay}
              onSelect={setActiveDay}
              isPrepDone={isPrepDone}
              weekDates={weekDates}
              todayIdx={todayIdx}
            />
          </div>
        )}

        {/* ── Day content ── */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 pb-40 lg:pb-8">
          {!weeklyPlan ? (
            <EmptyPlan generating={generating} onGenerate={handleGenerate} mealCount={filteredMeals.length} />
          ) : (
            <div key={activeDay} className="day-content-in" style={{ maxWidth: 640, margin: '0 auto' }}>
              {/* Day header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-semibold" style={{ fontSize: 18, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      {DAYS[activeDay]}
                    </h2>
                    {isToday && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--brand-light)', color: 'var(--brand-text)' }}>
                        Today
                      </span>
                    )}
                  </div>
                  <p className="nums" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {dayPlanned.length > 0
                      ? [
                          activeDayNutrition?.calories ? `${activeDayNutrition.calories.toLocaleString()} cal` : null,
                          activeDayFacts.hasTime ? formatPrepTime(activeDayFacts.minutes) : null,
                          activeDayFacts.cost > 0 ? formatCost(activeDayFacts.cost) : null,
                          `${dayPlanned.length} meals`,
                          `${dayPlanned.filter(c => isPrepDone(activeDay, c)).length} prepped`,
                        ].filter(Boolean).join(' · ')
                      : 'Not planned yet'}
                  </p>
                </div>
                <button onClick={() => handleRegenerateDay(activeDay)} disabled={regenDay === activeDay}
                  className="flex items-center gap-1.5 rounded-xl tap-target px-3"
                  style={{ height: 30, border: '1px solid var(--border-2)', color: 'var(--text-2)', fontSize: 11.5 }}>
                  {regenDay === activeDay
                    ? <Loader2 size={13} className="animate-[spin_1s_linear_infinite]" />
                    : <RotateCcw size={13} />}
                  Regen day
                </button>
              </div>

              {/* Per-day nutrition + time + cost highlights */}
              {dayPlanned.length > 0 && activeDayNutrition && (
                <div className="flex items-stretch rounded-2xl mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '10px 4px' }}>
                  {[
                    { val: activeDayNutrition.calories?.toLocaleString() ?? '—', label: 'Calories', color: nutritionColor(activeDayNutrition.calories) },
                    { val: activeDayFacts.hasTime ? formatPrepTime(activeDayFacts.minutes) : '—', label: 'Time', color: 'var(--text)' },
                    { val: activeDayFacts.cost > 0 ? formatCost(activeDayFacts.cost) : '—', label: 'Cost', color: 'var(--text)' },
                    { val: activeDayNutrition.protein_g != null ? `${Math.round(activeDayNutrition.protein_g)}g` : '—', label: 'Protein', color: 'var(--text)' },
                    { val: activeDayNutrition.carbs_g != null ? `${Math.round(activeDayNutrition.carbs_g)}g` : '—', label: 'Carbs', color: 'var(--text)' },
                  ].map((seg, i) => (
                    <div key={i} className="flex-1 text-center" style={{ borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <div className="nums" style={{ fontSize: 15, fontWeight: 700, color: seg.color }}>{seg.val}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{seg.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Meal rows / empty day */}
              {dayPlanned.length === 0 ? (
                <EmptyDay
                  onGenerateDay={() => handleRegenerateDay(activeDay)}
                  regenerating={regenDay === activeDay}
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {CATEGORIES.map((cat, i) => (
                    <MealCard
                      key={cat}
                      meal={dayMeals[cat] || null}
                      category={cat}
                      prepped={isPrepDone(activeDay, cat)}
                      onTogglePrep={() => togglePrep(activeDay, cat)}
                      onSwap={() => openSwap(activeDay, cat)}
                      onView={(m) => setViewMeal(m)}
                      onAdd={() => openSwap(activeDay, cat)}
                      animDelay={i * 45}
                    />
                  ))}
                </div>
              )}

              {/* AI summary */}
              {weeklyPlan && (
                <div className="rounded-2xl mt-5 p-4 flex items-start gap-3"
                  style={{ border: '1px solid var(--brand-light)', background: 'var(--brand-light)' }}>
                  <div className="shrink-0 flex items-center justify-center rounded-xl"
                    style={{ width: 36, height: 36, background: 'var(--brand)' }}>
                    <Wand2 size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ fontSize: 12, color: 'var(--brand-text)', marginBottom: 2 }}>AI plan summary</p>
                    {loadingDesc ? (
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-3)', fontSize: 13 }}>
                        <Loader2 size={13} className="animate-[spin_1s_linear_infinite]" /> Analyzing your week…
                      </div>
                    ) : planDesc ? (
                      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{planDesc}</p>
                    ) : (
                      <button onClick={() => fetchAIDescription(weeklyPlan, true)}
                        className="flex items-center gap-1.5 hover:opacity-70" style={{ fontSize: 12.5, color: 'var(--brand-text)', fontWeight: 600 }}>
                        <Sparkles size={12} /> Generate summary
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════ DESKTOP RIGHT PANEL ════════ */}
      {weeklyPlan && (
        <aside className="hidden lg:flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto"
          style={{ width: 264, borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>
          <PanelSection title="Week overview">
            <WeekOverview stats={stats} prepProgress={prepProgress} perDay={perDay} weeklyPlan={weeklyPlan} servings={servings} />
          </PanelSection>
          <PanelSection title="Grocery list" link="Open full" onLink={() => navigate('/grocery')}>
            <GroceryPreview weeklyPlan={weeklyPlan} onOpenFull={() => navigate('/grocery')} />
          </PanelSection>
          <PanelSection title="AI chef" link="Open" onLink={() => navigate('/ai')}>
            <AIPrompts
              onSwapSuggest={() => navigate('/ai')}
              onRegenerate={handleGenerate}
              onWhatCanIMake={() => navigate('/ai')}
            />
          </PanelSection>
          <PanelSection title="Quick actions">
            <QuickActions
              onPDF={() => exportToPDF(weeklyPlan, profile?.username, servings)}
              onPrint={() => window.print()}
              onCopyLink={() => handleShare('plan')}
              onShareHousehold={() => navigate('/household')}
              onUndoGenerate={undoGenerate}
              canUndo={!!prevPlanSnapshot}
            />
          </PanelSection>
        </aside>
      )}

      {/* ════════ MOBILE: slim stat strip + sheet triggers ════════ */}
      {weeklyPlan && (
        <div className="lg:hidden stat-strip" style={{ padding: '8px 12px' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileSheet('overview')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl tap-target"
              style={{ height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 12 }}>
              <BarChart3 size={14} />
              <span className="nums">{prepProgress.done}/{prepProgress.total} prepped</span>
            </button>
            <button onClick={() => setMobileSheet('grocery')}
              className="flex items-center justify-center rounded-xl tap-target"
              style={{ width: 44, height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              aria-label="Grocery list">
              <ShoppingCart size={16} />
            </button>
            <button onClick={() => setMobileSheet('ai')}
              className="flex items-center justify-center rounded-xl tap-target"
              style={{ width: 44, height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              aria-label="AI chef">
              <Sparkles size={16} />
            </button>
            <button onClick={() => setMobileSheet('actions')}
              className="flex items-center justify-center rounded-xl tap-target"
              style={{ width: 44, height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              aria-label="More actions">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile sheets ── */}
      <MobileSheet open={mobileSheet === 'overview'} onClose={() => setMobileSheet(null)} title="Week overview">
        <WeekOverview stats={stats} prepProgress={prepProgress} perDay={perDay} weeklyPlan={weeklyPlan} servings={servings} />
      </MobileSheet>
      <MobileSheet open={mobileSheet === 'grocery'} onClose={() => setMobileSheet(null)} title="Grocery list">
        <GroceryPreview weeklyPlan={weeklyPlan} onOpenFull={() => { setMobileSheet(null); navigate('/grocery') }} />
      </MobileSheet>
      <MobileSheet open={mobileSheet === 'ai'} onClose={() => setMobileSheet(null)} title="AI chef">
        <AIPrompts
          onSwapSuggest={() => { setMobileSheet(null); navigate('/ai') }}
          onRegenerate={() => { setMobileSheet(null); handleGenerate() }}
          onWhatCanIMake={() => { setMobileSheet(null); navigate('/ai') }}
        />
      </MobileSheet>
      <MobileSheet open={mobileSheet === 'actions'} onClose={() => setMobileSheet(null)} title="Quick actions">
        <QuickActions
          onPDF={() => { setMobileSheet(null); exportToPDF(weeklyPlan, profile?.username, servings) }}
          onPrint={() => { setMobileSheet(null); window.print() }}
          onCopyLink={() => { setMobileSheet(null); handleShare('plan') }}
          onShareHousehold={() => { setMobileSheet(null); navigate('/household') }}
          onUndoGenerate={() => { setMobileSheet(null); undoGenerate() }}
          canUndo={!!prevPlanSnapshot}
        />
      </MobileSheet>

      {/* ════════ Undo toasts ════════ */}
      {undoStack.length > 0 && (
        <UndoToast
          label={<>Swapped to <strong>{undoStack[0]?.newMeal?.item_name}</strong></>}
          onUndo={undoSwap} onDismiss={clearUndo} />
      )}
      {undoStack.length === 0 && prevPlanSnapshot && (
        <UndoToast label="Week regenerated" onUndo={undoGenerate} onDismiss={clearUndoGenerate} />
      )}

      {/* ════════ Swap modal ════════ */}
      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && closeSwap()}>
          <div className="w-full max-w-md card flex flex-col" style={{ maxHeight: '82vh', animation: 'modalIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {DAYS[swapTarget.dayIdx]} · {swapTarget.category}
                </p>
                <h3 className="font-display font-semibold mt-0.5" style={{ fontSize: 21, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  {CAT_STYLES[swapTarget.category]?.icon} {dayMeals[swapTarget.category] ? 'Swap meal' : 'Add meal'}
                </h3>
              </div>
              <button onClick={closeSwap} className="btn-ghost btn-icon"><X size={19} /></button>
            </div>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <input className="input" placeholder={`Search ${swapTarget.category} meals…`}
                value={swapSearch} onChange={e => setSwapSearch(e.target.value)} autoFocus />
            </div>
            {/* Eating out — quick option, no cooking */}
            <button onClick={handleEatingOut}
              className="w-full flex items-center gap-3 px-6 py-3.5 text-left transition-all"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: 'var(--brand-light)', border: '1px solid var(--brand)' }}>
                🍴
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ fontSize: 15, color: 'var(--text)' }}>I'm eating out</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No cooking — skips grocery, time &amp; cost</p>
              </div>
            </button>
            <div className="overflow-y-auto flex-1">
              {swapMeals.length === 0 ? (
                <div className="py-10 text-center" style={{ color: 'var(--text-3)', fontSize: 14 }}>No meals found</div>
              ) : swapMeals.map(meal => {
                const isCurrent = weeklyPlan?.[swapTarget.dayIdx]?.[swapTarget.category]?.id === meal.id
                return (
                  <button key={meal.id} onClick={() => handleSwapSelect(meal)}
                    className="w-full flex items-start gap-4 px-6 py-4 text-left transition-all group"
                    style={{ borderBottom: '1px solid var(--border)', background: isCurrent ? 'var(--brand-light)' : 'transparent' }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      {CAT_STYLES[meal.category]?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate" style={{ fontSize: 15, color: 'var(--text)' }}>{meal.item_name}</p>
                        {isCurrent && <span className="badge" style={{ fontSize: 9, background: 'var(--brand-light)', color: 'var(--brand-text)', border: '1px solid var(--brand-light)' }}>Current</span>}
                      </div>
                      <p className="truncate mt-0.5" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {meal.ingredients?.split(',').slice(0, 3).map(i => i.trim()).join(' · ')}
                      </p>
                    </div>
                    <ArrowLeftRight size={16} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--brand)' }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════ Share modal ════════ */}
      {showShareModal && weeklyPlan && (
        <ShareModal
          weeklyPlan={weeklyPlan}
          username={profile?.username}
          servings={servings}
          onClose={() => setShowShareModal(false)}
          initialTab={shareType}
        />
      )}

      {/* ════════ Recipe detail ════════ */}
      {viewMeal && (
        <RecipeDetailModal meal={viewMeal} onClose={() => setViewMeal(null)} />
      )}
    </div>
  )
}

// ── Undo toast ───────────────────────────────────────────────────────
function UndoToast({ label, onUndo, onDismiss }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
      style={{ bottom: 'calc(120px + env(safe-area-inset-bottom))', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(22,22,20,0.18)', animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
      <button onClick={onUndo}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all hover:opacity-80 tap-target"
        style={{ fontSize: 13, background: 'var(--brand)', color: '#fff' }}>
        <Undo2 size={13} /> Undo
      </button>
      <button onClick={onDismiss} style={{ color: 'var(--text-3)' }} className="tap-target"><X size={15} /></button>
    </div>
  )
}

// ── Empty state: no plan at all ───────────────────────────────────────
function EmptyPlan({ generating, onGenerate, mealCount }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 380, gap: 14, maxWidth: 360, margin: '0 auto' }}>
      <div className="flex items-center justify-center rounded-2xl" style={{ width: 64, height: 64, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <CalendarPlus size={30} style={{ color: 'var(--text-3)' }} />
      </div>
      <div>
        <h2 className="font-display font-semibold" style={{ fontSize: 19, color: 'var(--text)' }}>No plan yet</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
          Generate a balanced week from your {mealCount} available meals — swap, prep-track, and shop from one place.
        </p>
      </div>
      <button onClick={onGenerate} disabled={generating || mealCount === 0}
        className="btn-primary btn btn-lg tap-target gap-2" style={{ minWidth: 180 }}>
        {generating
          ? <><Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> Building…</>
          : <><Wand2 size={16} /> Generate week</>}
      </button>
      {mealCount === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Add some recipes first to get started.</p>
      )}
    </div>
  )
}

// ── Empty state: day has no meals ─────────────────────────────────────
function EmptyDay({ onGenerateDay, regenerating }) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl"
      style={{ minHeight: 220, gap: 10, padding: '32px 20px', border: '1px dashed var(--border-2)' }}>
      <CalendarPlus size={28} style={{ color: 'var(--text-3)' }} />
      <div>
        <p className="font-semibold" style={{ fontSize: 14, color: 'var(--text-2)' }}>No meals this day</p>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2, maxWidth: 220 }}>
          Generate this day from your library, or regenerate the whole week.
        </p>
      </div>
      <button onClick={onGenerateDay} disabled={regenerating}
        className="btn-primary btn-sm btn gap-1.5" style={{ marginTop: 2 }}>
        {regenerating ? <Loader2 size={13} className="animate-[spin_1s_linear_infinite]" /> : <Wand2 size={13} />}
        Generate day
      </button>
    </div>
  )
}

// ── Share Modal (preserved from original) ─────────────────────────────
function ShareModal({ weeklyPlan, username, servings = 1, onClose, initialTab }) {
  const [tab,        setTab]        = useState(initialTab || 'plan')
  const [copied,     setCopied]     = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const groceryMap   = buildGroceryList(weeklyPlan)
  const planText     = buildPlanShareText(weeklyPlan, username, servings)
  const groceryText  = buildGroceryShareText(groceryMap, username, servings)
  const shareableURL = buildShareableURL(weeklyPlan)

  async function handleShare() {
    const text  = tab === 'plan' ? planText : groceryText
    const title = tab === 'plan' ? `${username}'s Meal Plan` : `${username}'s Grocery List`
    const result = await shareText(title, text)
    if (result.clipboard) {
      setCopied(true); toast.success('Copied to clipboard!'); setTimeout(() => setCopied(false), 3000)
    } else if (result.success) {
      toast.success('Shared!')
    }
  }

  async function copyLink() {
    if (!shareableURL) return
    try {
      await navigator.clipboard.writeText(shareableURL)
      setLinkCopied(true); toast.success('Link copied!'); setTimeout(() => setLinkCopied(false), 3000)
    } catch { toast.error('Could not copy link') }
  }

  const activeText = tab === 'plan' ? planText : groceryText

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg card" style={{ animation: 'modalIn 0.3s cubic-bezier(0.16,1,0.3,1)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 className="font-display font-semibold" style={{ fontSize: 21, color: 'var(--text)', letterSpacing: '-0.03em' }}>Share</h3>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Share your plan or grocery list</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={19} /></button>
        </div>
        <div className="flex gap-1 p-4 pb-0">
          {[{ key: 'plan', label: '📅 Meal Plan' }, { key: 'grocery', label: '🛒 Grocery List' }].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2.5 rounded-xl font-semibold transition-all"
              style={{ fontSize: 13, background: tab === key ? 'var(--brand)' : 'var(--surface-2)', color: tab === key ? '#fff' : 'var(--text-3)' }}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-2xl p-4 font-mono"
            style={{ fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto' }}>
            {activeText}
          </div>
        </div>
        <div className="p-5 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={handleShare} className="btn-primary btn w-full btn-lg gap-2">
            <Share2 size={17} />
            {typeof navigator !== 'undefined' && navigator.share ? 'Share…' : copied ? '✓ Copied!' : 'Copy to clipboard'}
          </button>
          {tab === 'plan' && shareableURL && (
            <button onClick={copyLink} className="btn-secondary btn w-full gap-2">
              <LinkIcon size={16} />
              {linkCopied ? '✓ Link copied!' : 'Copy shareable link'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
