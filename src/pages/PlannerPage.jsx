import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { usePlans } from '../hooks/usePlans'
import { useAuth } from '../hooks/useAuth'
import { usePlanStore } from '../hooks/usePlanStore'
import { DAYS, CATEGORIES, makeEatingOutMeal, isEatingOut, makeLeftoversMeal } from '../lib/mealLogic'
import {
  buildPlanShareText, buildGroceryShareText, buildShareableURL, shareText,
} from '../lib/sharing'
import { buildGroceryList } from '../lib/mealLogic'
import { generatePlanDescription, generateRecipeFromName } from '../lib/aiFeatures'
import { weeklyNutritionTotals, nutritionColor } from '../lib/nutrition'
import { getMealFacts, formatPrepTime } from '../lib/mealFacts'
import { optimizeForMacros } from '../lib/macroOptimizer'
import { SEED_RECIPES } from '../lib/seedRecipes'
import { recommendDesserts, aiDessertToMeal } from '../lib/desserts'
import { SEED_DESSERTS } from '../lib/seedDesserts'
import { formatCost } from '../lib/budget'
import { getWeekDates, getTodayIndex, formatWeekRange, planningWeekOffset } from '../lib/weekDates'
import RecipeDetailModal, { CAT_ICONS } from '../components/RecipeDetailModal'
import DayStrip from '../components/planner/DayStrip'
import MealRow from '../components/ui/MealRow'
import {
  WeekOverview, PanelSection,
} from '../components/planner/PlannerPanels'
import {
  Save, Loader2, Sparkles, X, ArrowLeftRight, ArrowRight, RotateCcw, Edit2,
  Share2, Link as LinkIcon, Undo2, Wand2, Users,
  CalendarPlus, RefreshCw, BarChart3, Plus,
  Bookmark, SlidersHorizontal, Flame, Trash2, BookOpen, ChevronLeft, ChevronDown,
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
    generate, regenerateDay, undoRegenerateDay, swapMeal, reorderMeal, undoSwap, clearUndo,
    setDessert, removeDessert,
    undoGenerate, clearUndoGenerate, applyOptimizedPlan,
    clearPlan, togglePrep, isPrepDone, prepProgress, loadPlan: storeLoadPlan,
  } = usePlanStore()
  const { savePlan, plans, loadPlan: deserializePlanRow } = usePlans()

  // ── Local UI state ────────────────────────────────────────────────
  const [activeDay,      setActiveDay]      = useState(() => {
    if (planningWeekOffset() === 1) return 0   // next-week planning starts at Monday
    const t = getTodayIndex(); return t >= 0 ? t : 0
  })
  const [planName,       setPlanName]       = useState('')
  const [saving,         setSaving]         = useState(false)
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [regenSaveName,  setRegenSaveName]  = useState('')
  const [showTune,       setShowTune]       = useState(false)
  const [tuneCalories,   setTuneCalories]   = useState(profile?.daily_calories ? String(profile.daily_calories) : '')
  const [tuneProtein,    setTuneProtein]    = useState(profile?.daily_protein ? String(profile.daily_protein) : '')
  const [tuning,         setTuning]         = useState(false)
  const [tuneResult,     setTuneResult]     = useState(null)
  const [tuneConfirmClear, setTuneConfirmClear] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [dessertPickerDay, setDessertPickerDay] = useState(null)
  const [dessertAiLoading, setDessertAiLoading] = useState(false)
  const [swapTarget,     setSwapTarget]     = useState(null)
  const [moveTarget,     setMoveTarget]     = useState(null)
  const [swapSearch,     setSwapSearch]     = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareType,      setShareType]      = useState('plan')
  const [loadingDesc,    setLoadingDesc]    = useState(false)
  const [regenDay,       setRegenDay]       = useState(null)
  const [viewMeal,       setViewMeal]       = useState(null)
  const [mobileSheet,    setMobileSheet]    = useState(null) // 'overview' | 'grocery' | 'ai' | 'actions' | null

  // Single meals fetch — filter client-side instead of a second query.
  const { meals: allMeals, loading: mealsLoading, toggleFavorite, bulkAddMeals, addMeal, updateMeal } = useMeals()
  const filteredMeals = useMemo(
    () => allMeals.filter(m => dietTypes.includes(m.diet_type)),
    [allMeals, dietTypes],
  )

  const planWeekOffset = useMemo(() => planningWeekOffset(), [])
  const weekDates = useMemo(() => getWeekDates(new Date(), planWeekOffset), [planWeekOffset])
  const isNextWeek = planWeekOffset === 1
  const todayIdx = useMemo(() => getTodayIndex(), [])

  // Keep the active day valid if a plan loads/clears.
  useEffect(() => {
    if (activeDay < 0 || activeDay > 6) setActiveDay(0)
  }, [activeDay])

  function toggleDiet(key) {
    setDietTypes(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key])
  }

  const [showGenMenu, setShowGenMenu] = useState(false)
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [quickCreate, setQuickCreate] = useState(null)   // { name, category, diet_type, dayIdx } | null
  const [quickCreating, setQuickCreating] = useState(false)
  const [editInline, setEditInline] = useState(null)     // { id, name, category, diet_type, ingredients } | null
  const [savingInline, setSavingInline] = useState(false)
  function handleLoadPlan(plan) {
    storeLoadPlan(deserializePlanRow(plan))
    toast.success(`Loaded "${plan.name || 'saved plan'}"`)
  }

  async function handleGenerate() {
    if (!dietTypes.length) { toast.error('Select at least one diet type'); return }
    // If a plan is already showing, warn that regenerating replaces the
    // auto-saved one (unless it was manually saved). Otherwise generate freely.
    if (weeklyPlan) { setShowRegenModal(true); return }
    doGenerate()
  }

  async function doGenerate() {
    setShowRegenModal(false)
    try {
      const plan = await generate(filteredMeals, user?.id, profile?.budget_mode || false)
      toast.success('Week generated!')
      setActiveDay(isNextWeek ? 0 : (todayIdx >= 0 ? todayIdx : 0))
      fetchAIDescription(plan)
    } catch {
      toast.error('Not enough meals — add more recipes first.')
    }
  }

  async function handleSaveThenGenerate() {
    const name = regenSaveName.trim() || `Plan ${new Date().toLocaleDateString()}`
    setSaving(true)
    await savePlan(name, weeklyPlan)
    setSaving(false)
    setRegenSaveName('')
    toast.success(`Saved "${name}"`)
    doGenerate()
  }

  function handlePickDessert(meal) {
    setDessert(dessertPickerDay, meal)
    setDessertPickerDay(null)
    toast.success('Dessert added 🍰')
  }

  async function handleSeedDesserts() {
    setDessertAiLoading(true)
    try {
      await bulkAddMeals(SEED_DESSERTS.map(r => ({ ...r, source: 'manual' })))
      toast.success('Added a starter set of desserts 🍰')
    } catch {
      toast.error('Could not add desserts')
    }
    setDessertAiLoading(false)
  }

  async function handleAiDessert() {
    setDessertAiLoading(true)
    try {
      const gen = await generateRecipeFromName('simple homemade dessert')
      setDessert(dessertPickerDay, aiDessertToMeal(gen))
      setDessertPickerDay(null)
      toast.success('Dessert added 🍰')
    } catch {
      toast.error('Could not generate a dessert — try again')
    }
    setDessertAiLoading(false)
  }

  async function handleAddStarters() {
    setSeeding(true)
    const { error } = await bulkAddMeals(SEED_RECIPES.map(r => ({ ...r, source: 'manual' })))
    setSeeding(false)
    if (!error) toast.success(`Added ${SEED_RECIPES.length} starter recipes!`)
  }

  function handleApplyTune() {
    const cal = parseInt(tuneCalories, 10)
    const pro = parseInt(tuneProtein, 10)
    const target = {}
    if (Number.isFinite(cal) && cal > 0) target.calories = cal
    if (Number.isFinite(pro) && pro > 0) target.protein_g = pro
    if (!target.calories && !target.protein_g) { toast.error('Set a calorie or protein target first'); return }
    if (!weeklyPlan) return
    setTuning(true)
    // Defer so the UI can paint the loading state before the (sync) crunch.
    setTimeout(() => {
      try {
        const res = optimizeForMacros(weeklyPlan, filteredMeals, target, { dietTypes })
        applyOptimizedPlan(res.plan)
        setTuneResult({ before: res.before, perDay: res.perDay, target, improved: res.improved })
        if (res.improved) toast.success('Plan tuned toward your goals')
        else toast('Already as close as your library allows', { icon: 'ℹ️' })
      } catch {
        toast.error('Could not tune the plan')
      }
      setTuning(false)
    }, 30)
  }

  async function handleRegenerateDay(dayIdx) {
    setRegenDay(dayIdx)
    await new Promise(r => setTimeout(r, 350))
    regenerateDay(dayIdx, filteredMeals, profile?.budget_mode || false)
    setRegenDay(null)
    toast.success(
      (t) => (
        <span className="flex items-center gap-3">
          {DAYS[dayIdx]} refreshed
          <button
            onClick={() => { undoRegenerateDay(); toast.dismiss(t.id) }}
            style={{ fontWeight: 700, color: 'var(--brand-text)', textDecoration: 'underline' }}>
            Undo
          </button>
        </span>
      ),
      { duration: 6000 }
    )
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

  function openMove(dayIdx, category) { setMoveTarget({ dayIdx, category }) }
  function handleMoveTo(toDayIdx, toCategory) {
    if (!moveTarget) return
    reorderMeal(moveTarget.dayIdx, moveTarget.category, toDayIdx, toCategory)
    toast.success(`Moved to ${DAYS[toDayIdx]} ${toCategory}`, { icon: '↔️' })
    setMoveTarget(null)
  }
  function closeSwap() { setSwapTarget(null); setSwapSearch('') }

  // Create a new (flagged-incomplete) recipe from the typed search text, drop it
  // straight into the slot, then open its editor on the Recipes page so the user
  // can fill in details. Lets you add meals fast while planning and flesh them
  // out later — the recipe carries a "needs details" flag until then.
  // "Create" from the swap search opens a lightweight quick-capture popup
  // (name + category + diet) rather than the full editor — so there's no
  // mandatory-field dead end. Details get filled in later.
  function handleCreateFromSearch() {
    if (!swapTarget) return
    const name = swapSearch.trim()
    if (!name) return
    setQuickCreate({ name, category: swapTarget.category, diet_type: 'veg', dayIdx: swapTarget.dayIdx })
  }

  async function confirmQuickCreate() {
    if (!quickCreate || !quickCreate.name.trim()) return
    setQuickCreating(true)
    const base = {
      item_name: quickCreate.name.trim(),
      category: quickCreate.category,
      diet_type: quickCreate.diet_type,
      ingredients: '',
      source: 'manual',
    }
    // Try to flag as draft; fall back if the needs_details column is absent.
    let { data, error } = await addMeal({ ...base, needs_details: true }, { silent: true })
    if (error) {
      const res = await addMeal(base, { silent: true })
      data = res.data; error = res.error
    }
    setQuickCreating(false)
    if (error || !data) { toast.error('Could not create recipe'); return }
    // Drop it into the slot it was created for (use the meal's own category as
    // the slot, so an override lands correctly).
    swapMeal(quickCreate.dayIdx, quickCreate.category, data)
    setQuickCreate(null)
    closeSwap()
    toast.success(`Added "${data.item_name}" — add details when ready`, { icon: '📝' })
  }

  async function saveInlineEdit() {
    if (!editInline || !editInline.name.trim()) return
    setSavingInline(true)
    const updates = {
      item_name: editInline.name.trim(),
      category: editInline.category,
      diet_type: editInline.diet_type,
      ingredients: editInline.ingredients.trim(),
    }
    if (updates.ingredients) {
      const res = await updateMeal(editInline.id, { ...updates, needs_details: false })
      if (res?.error) await updateMeal(editInline.id, updates)
    } else {
      await updateMeal(editInline.id, updates)
    }
    setSavingInline(false)
    setEditInline(null)
    toast.success('Recipe updated')
  }

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

  function handleLeftovers() {
    if (!swapTarget) return
    swapMeal(swapTarget.dayIdx, swapTarget.category, makeLeftoversMeal(swapTarget.category))
    toast.success('Marked as leftovers', { icon: '🥡' })
    closeSwap()
  }

  function handleSurpriseMe() {
    if (!swapTarget) return
    const pool = filteredMeals.filter(m => m.category === swapTarget.category)
    if (!pool.length) { toast.error(`No ${swapTarget.category} meals to pick from`); return }
    const pick = pool[Math.floor(Math.random() * pool.length)]
    swapMeal(swapTarget.dayIdx, swapTarget.category, pick)
    toast.success(`Surprise — ${pick.item_name}!`, { icon: '🎲' })
    closeSwap()
  }

  function handleShare(type) { setShareType(type); setShowShareModal(true) }

  // Swap picker results, split into the tapped category (priority) and a
  // fallback of other categories. The fallback only appears when the tapped
  // category has few matches — so lunch stays lunch-first, but the rest of the
  // library is reachable when lunch comes up short. Recipes keep their own
  // category; they just occupy the slot.
  const FALLBACK_THRESHOLD = 2   // show "Other meals" when primary has <= this many
  const swapGroups = useMemo(() => {
    if (!swapTarget) return { primary: [], fallback: [] }
    const q = swapSearch.trim().toLowerCase()

    const dedupe = (list) => {
      const seen = new Set()
      const out = []
      for (const m of list) {
        const key = m.item_name.trim().toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(m)
      }
      return out
    }

    const matchesSearch = (m) => !q || m.item_name.toLowerCase().includes(q)

    // Primary: the tapped category.
    const primary = dedupe(
      allMeals.filter(m => m.category === swapTarget.category && matchesSearch(m))
    )

    // Fallback: other categories — only surfaced when primary is thin.
    let fallback = []
    if (primary.length <= FALLBACK_THRESHOLD) {
      fallback = dedupe(
        allMeals.filter(m => m.category !== swapTarget.category && matchesSearch(m))
      )
      // Don't let a name that already appears in primary repeat in fallback.
      const primaryNames = new Set(primary.map(m => m.item_name.trim().toLowerCase()))
      fallback = fallback.filter(m => !primaryNames.has(m.item_name.trim().toLowerCase()))
    }

    return { primary, fallback }
  }, [swapTarget, swapSearch, allMeals])

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
  // Overlay the latest meal data (nutrition, cost, prep_time, photo) onto the
  // saved plan by matching ids. This makes plans generated BEFORE a data change
  // (e.g. the enrichment import) show current values without regenerating.
  const mergedPlan = useMemo(() => {
    if (!weeklyPlan) return null
    if (!allMeals?.length) return weeklyPlan
    const byId = new Map(allMeals.map(m => [m.id, m]))
    const out = {}
    for (const [day, meals] of Object.entries(weeklyPlan)) {
      out[day] = {}
      for (const [cat, meal] of Object.entries(meals)) {
        if (!meal) { out[day][cat] = meal; continue }
        const live = byId.get(meal.id)
        // Keep the saved meal but fill in fields from the live record so older
        // snapshots gain prep_time/calories/cost/photo. Saved values win if set.
        out[day][cat] = live ? { ...live, ...meal,
          prep_time:        meal.prep_time        ?? live.prep_time,
          calories:         meal.calories         ?? live.calories,
          cost_per_serving: meal.cost_per_serving ?? live.cost_per_serving,
          photo_url:        meal.photo_url        ?? live.photo_url,
          video_url:        meal.video_url        ?? live.video_url,
          written_url:      meal.written_url      ?? live.written_url,
          detail_notes:     meal.detail_notes     ?? live.detail_notes,
          protein_g:        meal.protein_g        ?? live.protein_g,
          carbs_g:          meal.carbs_g          ?? live.carbs_g,
          fat_g:            meal.fat_g            ?? live.fat_g,
          fiber_g:          meal.fiber_g          ?? live.fiber_g,
          // Recipe-truth field: always reflect the live recipe so the Draft
          // badge clears once details are added on the Recipes page.
          needs_details:    live.needs_details,
        } : meal
      }
    }
    return out
  }, [weeklyPlan, allMeals])

  const activeDayNutrition = useMemo(() => {
    if (!mergedPlan?.[activeDay]) return null
    return weeklyNutritionTotals({ 0: mergedPlan[activeDay] }, servings).perDay
  }, [mergedPlan, activeDay, servings])

  // Active-day time + cost totals for the day-header highlight line.
  const activeDayFacts = useMemo(() => {
    const day = mergedPlan?.[activeDay]
    if (!day) return { minutes: 0, hasTime: false, cost: 0 }
    let minutes = 0, hasTime = false, cost = 0
    Object.values(day).forEach(meal => {
      if (!meal) return
      const f = getMealFacts(meal, servings)
      if (f.prepTime != null) { minutes += f.prepTime; hasTime = true }
      if (f.cost != null) cost += f.cost * servings
    })
    return { minutes, hasTime, cost }
  }, [mergedPlan, activeDay, servings])

  // Swipe-between-days state (must be before any early return).
  const swipeRef = useRef({ x: null, y: null })
  const [swipeAnim, setSwipeAnim] = useState('')

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

  const dayMeals = mergedPlan?.[activeDay] || {}

  // Swipe left/right on the day section to move between days.
  function onDayTouchStart(e) {
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  function onDayTouchEnd(e) {
    const s = swipeRef.current
    if (s.x == null) return
    const dx = e.changedTouches[0].clientX - s.x
    const dy = e.changedTouches[0].clientY - s.y
    swipeRef.current = { x: null, y: null }
    // Horizontal, decisive, not a vertical scroll.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && activeDay < 6) { setSwipeAnim('slideLeft'); setActiveDay(activeDay + 1) }
      else if (dx > 0 && activeDay > 0) { setSwipeAnim('slideRight'); setActiveDay(activeDay - 1) }
    }
  }
  const dayPlanned = CATEGORIES.filter(c => dayMeals[c])
  const isToday = activeDay === todayIdx

  return (
    <div className="flex flex-col lg:flex-row" style={{ animation: 'fadeIn 0.3s ease-out', minHeight: '100%' }}>

      {/* ════════ MAIN COLUMN ════════ */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* ── Header bar ── */}
        <div className="px-4 pt-4 sm:pt-6 pb-2">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button onClick={() => navigate('/today')}
                  className="flex items-center gap-1 tap-target transition-all active:scale-95 mb-1.5"
                  style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>
                  <ChevronLeft size={13} /> Today
                </button>
                <h1 className="font-display font-bold truncate" style={{ fontSize: 26, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                  {weeklyPlan ? 'Your week' : 'Plan your week'}
                </h1>
                {weeklyPlan && (
                  <p className="nums flex items-center gap-1.5" style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                    {isNextWeek && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent-dark)', background: 'var(--accent-light)', padding: '1px 7px', borderRadius: 99 }}>
                        Next week
                      </span>
                    )}
                    {formatWeekRange(weekDates)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0" style={{ marginTop: 22 }}>
                {weeklyPlan && (
                  <button onClick={() => setShowTune(true)}
                    aria-label="Tune plan"
                    className="flex items-center justify-center tap-target transition-all active:scale-95"
                    style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-2)' }}>
                    <SlidersHorizontal size={16} />
                  </button>
                )}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => plans?.length > 0 ? setShowGenMenu(v => !v) : handleGenerate()}
                    disabled={generating || !dietTypes.length}
                    className="btn-primary btn tap-target gap-2" style={{ height: 38 }}>
                    {generating
                      ? <><Loader2 size={15} className="animate-[spin_1s_linear_infinite]" /> <span className="hidden sm:inline">Building…</span></>
                      : <><Wand2 size={15} /> <span className="hidden sm:inline">{weeklyPlan ? 'Regenerate' : 'Generate'}</span>{plans?.length > 0 && <ChevronDown size={13} />}</>}
                  </button>
                  {showGenMenu && plans?.length > 0 && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowGenMenu(false)} />
                      <div className="card" style={{ position: 'absolute', top: 44, right: 0, zIndex: 41, width: 230, padding: 6, boxShadow: 'var(--shadow-lg)' }}>
                        <button onClick={() => { setShowGenMenu(false); handleGenerate() }}
                          className="w-full flex items-center gap-2.5 tap-target text-left" style={{ padding: '10px 12px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                          <Wand2 size={15} style={{ color: 'var(--accent-dark)' }} /> {weeklyPlan ? 'Generate new week' : 'Generate a new plan'}
                        </button>
                        <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Load a saved plan</div>
                        {plans.slice(0, 5).map(p => (
                          <button key={p.id} onClick={() => { setShowGenMenu(false); handleLoadPlan(p) }}
                            className="w-full flex items-center gap-2.5 tap-target text-left" style={{ padding: '9px 12px', borderRadius: 12, fontSize: 13, color: 'var(--text-2)' }}>
                            <Bookmark size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                            <span className="truncate">{p.name || 'Saved plan'}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Day strip ── */}
        {weeklyPlan && (
          <div className="px-4 pt-1 pb-2">
            <div className="max-w-2xl mx-auto">
              <DayStrip
                weeklyPlan={weeklyPlan}
                activeDay={activeDay}
                onSelect={setActiveDay}
                isPrepDone={isPrepDone}
                weekDates={weekDates}
                todayIdx={isNextWeek ? -1 : todayIdx}
              />
            </div>
          </div>
        )}

        {/* ── Day content ── */}
        <div className="flex-1 px-4 py-4">
          <div className="max-w-2xl mx-auto">
          {!weeklyPlan ? (
            <EmptyPlan generating={generating} onGenerate={handleGenerate} mealCount={filteredMeals.length}
              hasSavedPlans={plans?.length > 0} onLoadSaved={() => navigate('/saved')}
              onAddStarters={handleAddStarters} seeding={seeding} starterCount={SEED_RECIPES.length}
              onGoToRecipes={() => navigate('/recipes')} />
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
                  title="Shuffle this day" aria-label="Shuffle this day"
                  className="flex items-center justify-center tap-target transition-all active:scale-90"
                  style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: 'transparent', border: 'none',
                    color: 'var(--text-3)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}>
                  {regenDay === activeDay
                    ? <Loader2 size={15} className="animate-[spin_1s_linear_infinite]" />
                    : <RotateCcw size={15} />}
                </button>
              </div>

              {/* Per-day nutrition + time + cost highlights */}
              {dayPlanned.length > 0 && activeDayNutrition && (
                <div className="flex items-stretch rounded-2xl mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '12px 4px' }}>
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

              {/* Nutrition goal progress (only when goals are set) */}
              {dayPlanned.length > 0 && activeDayNutrition && (profile?.daily_calories || profile?.daily_protein) && (
                <div className="rounded-2xl mb-4 p-3.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {profile?.daily_calories ? (
                    <GoalBar label="Calories" current={activeDayNutrition.calories || 0} goal={profile.daily_calories} unit="" />
                  ) : null}
                  {profile?.daily_protein ? (
                    <div style={{ marginTop: profile?.daily_calories ? 10 : 0 }}>
                      <GoalBar label="Protein" current={Math.round(activeDayNutrition.protein_g || 0)} goal={profile.daily_protein} unit="g" />
                    </div>
                  ) : null}
                </div>
              )}

              {/* Meal rows / empty day */}
              {dayPlanned.length === 0 ? (
                <EmptyDay
                  onGenerateDay={() => handleRegenerateDay(activeDay)}
                  regenerating={regenDay === activeDay}
                />
              ) : (
                <div className="flex flex-col gap-2.5"
                  key={activeDay}
                  onTouchStart={onDayTouchStart}
                  onTouchEnd={onDayTouchEnd}
                  style={{ animation: swipeAnim === 'slideLeft' ? 'daySlideL 0.28s ease' : swipeAnim === 'slideRight' ? 'daySlideR 0.28s ease' : undefined }}>
                  {CATEGORIES.map((cat, i) => (
                    dayMeals[cat] ? (
                      <div key={cat} style={{ animation: `cardStagger 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms both` }}>
                        <MealRow
                          meal={dayMeals[cat]}
                          category={cat}
                          servings={servings}
                          prepped={isPrepDone(activeDay, cat)}
                          onTogglePrep={() => togglePrep(activeDay, cat)}
                          onView={(m) => setViewMeal({ meal: m, dayIdx: activeDay, category: cat })}
                        />
                      </div>
                    ) : (
                      <button key={cat} onClick={() => openSwap(activeDay, cat)}
                        className="flex items-center gap-3.5 tap-target transition-all active:scale-[0.99]"
                        style={{ padding: '13px 15px', borderRadius: 18, border: '1.5px dashed var(--border-2)', background: 'transparent' }}>
                        <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 9, border: '2px dashed var(--border-2)', color: 'var(--text-3)' }}>
                          <Plus size={15} />
                        </span>
                        <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--surface-2)', fontSize: 20, opacity: 0.5 }}>
                          {CAT_ICONS[cat]}
                        </span>
                        <div className="text-left">
                          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{cat}</p>
                          <p className="font-display font-semibold" style={{ fontSize: 15, color: 'var(--text-3)' }}>Add a meal</p>
                        </div>
                      </button>
                    )
                  ))}

                  {/* Dessert — a first-class slot, filled from list or AI (opt-in) */}
                  {dayMeals.Dessert ? (
                    <MealRow
                      meal={dayMeals.Dessert}
                      category="Dessert"
                      servings={servings}
                      prepped={isPrepDone(activeDay, 'Dessert')}
                      onTogglePrep={() => togglePrep(activeDay, 'Dessert')}
                      onView={(m) => setViewMeal({ meal: m, dayIdx: activeDay, category: 'Dessert' })}
                      onRemove={() => removeDessert(activeDay)}
                      accent
                    />
                  ) : (
                    <button onClick={() => setDessertPickerDay(activeDay)}
                      className="flex items-center gap-3.5 tap-target transition-all active:scale-[0.99]"
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
                </div>
              )}

              {/* AI summary */}
              {weeklyPlan && (
                <div className="card mt-5 p-4 flex items-start gap-3">
                  <div className="shrink-0 flex items-center justify-center rounded-xl"
                    style={{ width: 36, height: 36, background: 'var(--accent-light)' }}>
                    <Wand2 size={16} style={{ color: 'var(--accent-dark)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>AI plan summary</p>
                    {loadingDesc ? (
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-3)', fontSize: 13 }}>
                        <Loader2 size={13} className="animate-[spin_1s_linear_infinite]" /> Analyzing your week…
                      </div>
                    ) : planDesc ? (
                      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{planDesc}</p>
                    ) : (
                      <button onClick={() => fetchAIDescription(weeklyPlan, true)}
                        className="flex items-center gap-1.5 hover:opacity-70" style={{ fontSize: 12.5, color: 'var(--accent-dark)', fontWeight: 600 }}>
                        <Sparkles size={12} /> Generate summary
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Week overview — collapsible on mobile (desktop has the sidebar) */}
              {weeklyPlan && (
                <div className="lg:hidden mt-6">
                  <button onClick={() => setOverviewOpen(v => !v)}
                    className="card w-full flex items-center gap-3 tap-target transition-all active:scale-[0.99]"
                    style={{ padding: '13px 15px' }}>
                    <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-light)' }}>
                      <BarChart3 size={16} style={{ color: 'var(--accent-dark)' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-display font-bold" style={{ fontSize: 14.5, color: 'var(--text)' }}>Week overview</p>
                      <p className="nums" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                        {prepProgress.done}/{prepProgress.total} prepped · time, cost & macros
                      </p>
                    </div>
                    <ChevronDown size={18} style={{ color: 'var(--text-3)', transform: overviewOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }} />
                  </button>
                  {overviewOpen && (
                    <div style={{ marginTop: 10, animation: 'cardStagger 0.3s ease both' }}>
                      <WeekOverview stats={stats} prepProgress={prepProgress} perDay={perDay} weeklyPlan={mergedPlan} servings={servings} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ════════ DESKTOP RIGHT PANEL ════════ */}
      {weeklyPlan && (
        <aside className="hidden lg:flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto"
          style={{ width: 264, borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>
          <PanelSection title="Week overview">
            <WeekOverview stats={stats} prepProgress={prepProgress} perDay={perDay} weeklyPlan={mergedPlan} servings={servings} />
          </PanelSection>
        </aside>
      )}

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
        <div className="app-modal app-modal-center modal-safe"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && closeSwap()}>
          <div className="app-modal-card" style={{ maxHeight: '82dvh' }}>
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
                value={swapSearch} onChange={e => setSwapSearch(e.target.value)} />
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
            {/* Leftovers — quick no-cook option, reuse a prior meal */}
            <button onClick={handleLeftovers}
              className="w-full flex items-center gap-3 px-6 py-3.5 text-left transition-all"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                🥡
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ fontSize: 15, color: 'var(--text)' }}>Leftovers</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No cooking — skips grocery, time &amp; cost</p>
              </div>
            </button>
            <button onClick={handleSurpriseMe}
              className="w-full flex items-center gap-3 px-6 py-3.5 text-left transition-all"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                🎲
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ fontSize: 15, color: 'var(--text)' }}>Surprise me</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Pick a random {swapTarget.category.toLowerCase()} for me</p>
              </div>
            </button>
            <div className="overflow-y-auto flex-1">
              {(() => {
                const renderRow = (meal, showCatTag) => {
                  const isCurrent = weeklyPlan?.[swapTarget.dayIdx]?.[swapTarget.category]?.id === meal.id
                  return (
                    <button key={meal.id} onClick={() => handleSwapSelect(meal)}
                      className="w-full flex items-start gap-4 px-6 py-4 text-left transition-all group"
                      style={{ borderBottom: '1px solid var(--border)', background: isCurrent ? 'var(--accent-light)' : 'transparent' }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--surface-2)' }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        {CAT_STYLES[meal.category]?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate" style={{ fontSize: 15, color: 'var(--text)' }}>{meal.item_name}</p>
                          {isCurrent && <span className="badge" style={{ fontSize: 9, background: 'var(--accent-light)', color: 'var(--accent-text)', border: '1px solid var(--accent-light)' }}>Current</span>}
                          {showCatTag && (
                            <span className="badge" style={{ fontSize: 9, background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                              {meal.category}
                            </span>
                          )}
                        </div>
                        <p className="truncate mt-0.5" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                          {meal.ingredients?.split(',').slice(0, 3).map(i => i.trim()).join(' · ')}
                        </p>
                      </div>
                      <ArrowLeftRight size={16} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }} />
                    </button>
                  )
                }

                const { primary, fallback } = swapGroups
                const q = swapSearch.trim()
                const exactExists = q && [...primary, ...fallback].some(
                  m => m.item_name.trim().toLowerCase() === q.toLowerCase()
                )
                const createRow = q && !exactExists ? (
                  <button onClick={handleCreateFromSearch}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left transition-all"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-light)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', color: '#1A1C16' }}>
                      <Plus size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ fontSize: 15, color: 'var(--text)' }}>Create “{q}”</p>
                      <p style={{ fontSize: 12, color: 'var(--accent-text)' }}>Add it now, fill in details after</p>
                    </div>
                    <ArrowRight size={16} className="shrink-0" style={{ color: 'var(--accent-dark)' }} />
                  </button>
                ) : null

                if (primary.length === 0 && fallback.length === 0) {
                  return createRow || <div className="py-10 text-center" style={{ color: 'var(--text-3)', fontSize: 14 }}>No meals found</div>
                }

                const sectionHeader = (label) => (
                  <div className="px-6 pt-3 pb-1.5" style={{ background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</p>
                  </div>
                )

                return (
                  <>
                    {primary.length > 0 && (
                      <>
                        {fallback.length > 0 && sectionHeader(swapTarget.category)}
                        {primary.map(m => renderRow(m, false))}
                      </>
                    )}
                    {fallback.length > 0 && (
                      <>
                        {sectionHeader('Other meals')}
                        {fallback.map(m => renderRow(m, true))}
                      </>
                    )}
                    {createRow}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ════════ Inline edit meal (from the plan modal) ════════ */}
      {editInline && (
        <div className="app-modal app-modal-center modal-safe" style={{ zIndex: 75 }}
          onClick={e => e.target === e.currentTarget && !savingInline && setEditInline(null)}>
          <div className="app-modal-card" style={{ padding: 22, maxHeight: '86dvh', overflowY: 'auto' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-light)' }}>
                <Edit2 size={18} style={{ color: 'var(--accent-dark)' }} />
              </div>
              <h3 className="font-display font-bold" style={{ fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text)' }}>Edit recipe</h3>
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, display: 'block' }}>Name</label>
            <input value={editInline.name}
              onChange={e => setEditInline(p => ({ ...p, name: e.target.value }))}
              className="input mb-4" style={{ width: '100%' }} />

            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, display: 'block' }}>Category</label>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[...CATEGORIES, 'Dessert'].map(cat => {
                const active = editInline.category === cat
                return (
                  <button key={cat} onClick={() => setEditInline(p => ({ ...p, category: cat }))}
                    className="px-3 py-1.5 rounded-full tap-target transition-all"
                    style={{ fontSize: 12.5, fontWeight: 600, background: active ? 'var(--accent)' : 'var(--surface-2)', color: active ? '#1A1C16' : 'var(--text-2)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}` }}>
                    {cat}
                  </button>
                )
              })}
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, display: 'block' }}>Diet</label>
            <div className="flex gap-1.5 mb-4">
              {[['veg','Veg'],['vegan','Vegan'],['nonveg','Non-veg']].map(([key, label]) => {
                const active = editInline.diet_type === key
                return (
                  <button key={key} onClick={() => setEditInline(p => ({ ...p, diet_type: key }))}
                    className="flex-1 px-3 py-1.5 rounded-full tap-target transition-all"
                    style={{ fontSize: 12.5, fontWeight: 600, background: active ? 'var(--accent)' : 'var(--surface-2)', color: active ? '#1A1C16' : 'var(--text-2)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}` }}>
                    {label}
                  </button>
                )
              })}
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, display: 'block' }}>Ingredients</label>
            <textarea value={editInline.ingredients}
              onChange={e => setEditInline(p => ({ ...p, ingredients: e.target.value }))}
              className="input mb-2" style={{ width: '100%', minHeight: 70, resize: 'vertical' }}
              placeholder="comma, separated, ingredients" />
            <button onClick={() => { const id = editInline.id; setEditInline(null); navigate('/recipes', { state: { editMealId: id, returnTo: '/planner' } }) }}
              className="text-left mb-5" style={{ fontSize: 12, color: 'var(--accent-dark)', fontWeight: 600 }}>
              Open full editor (photos, video, macros) →
            </button>

            <div className="flex gap-2.5">
              <button onClick={() => setEditInline(null)} disabled={savingInline}
                className="btn-secondary btn flex-1 tap-target">Cancel</button>
              <button onClick={saveInlineEdit} disabled={savingInline || !editInline.name.trim()}
                className="btn-primary btn flex-1 tap-target gap-2">
                {savingInline ? <Loader2 size={15} className="animate-[spin_1s_linear_infinite]" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Quick-create meal (name + category + diet) ════════ */}
      {quickCreate && (
        <div className="app-modal app-modal-center modal-safe" style={{ zIndex: 75 }}
          onClick={e => e.target === e.currentTarget && !quickCreating && setQuickCreate(null)}>
          <div className="app-modal-card" style={{ padding: 22 }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-light)' }}>
                <Plus size={19} style={{ color: 'var(--accent-dark)' }} />
              </div>
              <div>
                <h3 className="font-display font-bold" style={{ fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text)' }}>Quick add</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Add now, fill in details later</p>
              </div>
            </div>

            {/* Name */}
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, display: 'block' }}>Name</label>
            <input value={quickCreate.name} autoFocus
              onChange={e => setQuickCreate(p => ({ ...p, name: e.target.value }))}
              className="input mb-4" style={{ width: '100%' }} placeholder="e.g. Grandma's dal" />

            {/* Category */}
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, display: 'block' }}>Category</label>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[...CATEGORIES, 'Dessert'].map(cat => {
                const active = quickCreate.category === cat
                return (
                  <button key={cat} onClick={() => setQuickCreate(p => ({ ...p, category: cat }))}
                    className="px-3 py-1.5 rounded-full tap-target transition-all"
                    style={{ fontSize: 12.5, fontWeight: 600, background: active ? 'var(--accent)' : 'var(--surface-2)', color: active ? '#1A1C16' : 'var(--text-2)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}` }}>
                    {cat}
                  </button>
                )
              })}
            </div>

            {/* Diet */}
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, display: 'block' }}>Diet</label>
            <div className="flex gap-1.5 mb-6">
              {[['veg','Veg'],['vegan','Vegan'],['nonveg','Non-veg']].map(([key, label]) => {
                const active = quickCreate.diet_type === key
                return (
                  <button key={key} onClick={() => setQuickCreate(p => ({ ...p, diet_type: key }))}
                    className="flex-1 px-3 py-1.5 rounded-full tap-target transition-all"
                    style={{ fontSize: 12.5, fontWeight: 600, background: active ? 'var(--accent)' : 'var(--surface-2)', color: active ? '#1A1C16' : 'var(--text-2)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}` }}>
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => setQuickCreate(null)} disabled={quickCreating}
                className="btn-secondary btn flex-1 tap-target">Cancel</button>
              <button onClick={confirmQuickCreate} disabled={quickCreating || !quickCreate.name.trim()}
                className="btn-primary btn flex-1 tap-target gap-2">
                {quickCreating ? <Loader2 size={15} className="animate-[spin_1s_linear_infinite]" /> : <><Plus size={15} /> Add</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Move meal modal ════════ */}
      {moveTarget && (
        <div className="app-modal modal-safe"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && setMoveTarget(null)}>
          <div className="app-modal-card" style={{ maxHeight: '82dvh' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Moving {weeklyPlan?.[moveTarget.dayIdx]?.[moveTarget.category]?.item_name || 'meal'}
                </p>
                <h3 className="font-display font-semibold mt-0.5" style={{ fontSize: 21, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  Move to…
                </h3>
              </div>
              <button onClick={() => setMoveTarget(null)} className="btn-ghost btn-icon"><X size={19} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {DAYS.map((day, dIdx) => (
                <div key={day} style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '6px 8px 4px' }}>{day}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CATEGORIES.map(cat => {
                      const occupied = weeklyPlan?.[dIdx]?.[cat]
                      const isSelf = dIdx === moveTarget.dayIdx && cat === moveTarget.category
                      return (
                        <button key={cat} onClick={() => handleMoveTo(dIdx, cat)} disabled={isSelf}
                          className="flex items-center justify-between rounded-xl tap-target transition-all px-3 py-2.5 text-left"
                          style={{
                            border: '1px solid var(--border)',
                            background: isSelf ? 'var(--surface-2)' : 'var(--surface)',
                            opacity: isSelf ? 0.5 : 1,
                          }}
                          onMouseEnter={e => { if (!isSelf) e.currentTarget.style.borderColor = 'var(--brand)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}>
                          <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{cat}</span>
                          <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{isSelf ? 'current' : occupied ? 'swap' : 'empty'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', textAlign: 'center' }}>
                Moving onto an occupied slot swaps the two meals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Dessert picker ════════ */}
      {dessertPickerDay !== null && (
        <div className="app-modal app-modal-center modal-safe"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && setDessertPickerDay(null)}>
          <div className="app-modal-card" style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-1">
              <h3 className="font-display font-semibold flex items-center gap-2" style={{ fontSize: 20, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                🍰 Add a dessert
              </h3>
              <button onClick={() => setDessertPickerDay(null)} className="btn-ghost btn-icon"><X size={19} /></button>
            </div>
            <p className="px-6" style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
              For {DAYS[dessertPickerDay]}. Pick from your recipes, or let AI suggest a simple one.
            </p>

            <div className="px-6 pb-3">
              {(() => {
                const suggestions = recommendDesserts(allMeals, 4)
                if (!suggestions.length) {
                  return (
                    <div style={{ padding: '4px 0 14px' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 12 }}>
                        No desserts in your library yet. Add a starter set of simple desserts, or let AI suggest one.
                      </p>
                      <button onClick={handleSeedDesserts} disabled={dessertAiLoading}
                        className="btn-primary btn w-full tap-target gap-2 mb-2">
                        {dessertAiLoading ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Plus size={16} />}
                        Add 18 starter desserts
                      </button>
                    </div>
                  )
                }
                return (
                  <div className="flex flex-col gap-2 mb-3">
                    {suggestions.map(m => (
                      <button key={m.id} onClick={() => handlePickDessert(m)}
                        className="card flex items-center gap-3 p-3 text-left tap-target transition-all active:scale-[0.99]">
                        <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-light)', fontSize: 17 }}>🍰</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold truncate" style={{ fontSize: 14, color: 'var(--text)' }}>{m.item_name}</p>
                          {m.calories != null && <p className="nums" style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.calories} cal</p>}
                        </div>
                        <Plus size={16} style={{ color: 'var(--accent)' }} />
                      </button>
                    ))}
                  </div>
                )
              })()}

              <button onClick={handleAiDessert} disabled={dessertAiLoading}
                className="btn-secondary btn w-full tap-target gap-2 mb-6">
                {dessertAiLoading ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Sparkles size={16} />}
                Suggest one with AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Tune this plan (macro targeting) ════════ */}
      {showTune && (
        <div className="app-modal modal-safe"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && setShowTune(false)}>
          <div className="app-modal-card" style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center rounded-2xl" style={{ width: 40, height: 40, background: 'var(--brand-light)' }}>
                  <SlidersHorizontal size={19} style={{ color: 'var(--brand)' }} />
                </div>
                <h3 className="font-display font-semibold" style={{ fontSize: 20, color: 'var(--text)', letterSpacing: '-0.02em' }}>Tune this plan</h3>
              </div>
              <button onClick={() => setShowTune(false)} className="btn-ghost btn-icon"><X size={19} /></button>
            </div>
            <p className="px-6" style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 16 }}>
              Set daily targets and I'll swap meals to get the week's average as close as your library allows — then show you exactly how close.
            </p>

            <div className="px-6 grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="input-label flex items-center gap-1.5"><Flame size={11} /> Calories / day</label>
                <input className="input" type="number" min="0" inputMode="numeric" placeholder="e.g. 2000"
                  value={tuneCalories} onChange={e => setTuneCalories(e.target.value)} />
              </div>
              <div>
                <label className="input-label">Protein / day (g)</label>
                <input className="input" type="number" min="0" inputMode="numeric" placeholder="e.g. 140"
                  value={tuneProtein} onChange={e => setTuneProtein(e.target.value)} />
              </div>
            </div>

            {/* Honest result: target vs achieved */}
            {tuneResult && (
              <div className="mx-6 mb-4 rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>Result · daily average</p>
                {tuneResult.target.calories != null && (
                  <TuneRow label="Calories" achieved={Math.round(tuneResult.perDay.calories)} target={tuneResult.target.calories} unit="" />
                )}
                {tuneResult.target.protein_g != null && (
                  <div style={{ marginTop: 10 }}>
                    <TuneRow label="Protein" achieved={Math.round(tuneResult.perDay.protein_g)} target={tuneResult.target.protein_g} unit="g" />
                  </div>
                )}
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.45 }}>
                  This is the closest combination from your current recipes. Add more varied meals to hit targets more precisely.
                </p>
              </div>
            )}

            {/* Plan settings — diet, servings, avoid-repeats */}
            <div className="px-6 mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Plan settings</p>

              <p className="input-label mb-2">Diet filter</p>
              <div className="flex gap-2 flex-wrap mb-4">
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

              <div className="flex items-center justify-between mb-3">
                <p className="input-label mb-0 flex items-center gap-1.5"><Users size={11} /> Cooking for</p>
                <div className="stepper">
                  <button onClick={() => setServings(servings - 1)} disabled={servings <= 1} className="stepper-btn" style={{ opacity: servings <= 1 ? 0.3 : 1 }}>−</button>
                  <span className="stepper-value">{servings}</span>
                  <button onClick={() => setServings(servings + 1)} disabled={servings >= 20} className="stepper-btn" style={{ opacity: servings >= 20 ? 0.3 : 1 }}>+</button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="input-label mb-0 flex items-center gap-1.5"><RefreshCw size={11} /> Avoid repeats</p>
                <button onClick={() => setAvoidRepeats(v => !v)}
                  role="switch" aria-checked={avoidRepeats} aria-label="Avoid repeats"
                  className="relative rounded-full transition-all duration-300 shrink-0"
                  style={{ width: 52, height: 30, background: avoidRepeats ? 'var(--brand)' : 'var(--border-2)', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <span className="absolute rounded-full bg-white shadow-md transition-transform duration-300"
                    style={{ width: 24, height: 24, top: 3, left: 3, transform: avoidRepeats ? 'translateX(22px)' : 'translateX(0)' }} />
                </button>
              </div>
            </div>

            {/* Save / clear this plan */}
            <div className="px-6 mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>Save this plan</p>
              <div className="flex gap-2 mb-2">
                <input className="input flex-1" placeholder="Name this plan…"
                  value={planName} onChange={e => setPlanName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()} />
                <button onClick={handleSave} disabled={saving || !planName.trim()} className="btn-primary btn gap-1.5 shrink-0">
                  {saving ? <Loader2 size={15} className="animate-[spin_1s_linear_infinite]" /> : <Save size={15} />} Save
                </button>
              </div>
              <button onClick={() => { if (tuneConfirmClear) { clearPlan(); setShowTune(false); setTuneConfirmClear(false); toast.success('Plan cleared') } else { setTuneConfirmClear(true) } }}
                className="btn-ghost btn w-full tap-target gap-2"
                style={{ color: tuneConfirmClear ? 'var(--danger)' : 'var(--text-3)' }}>
                <Trash2 size={14} /> {tuneConfirmClear ? 'Tap again to clear the whole plan' : 'Clear plan'}
              </button>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-2">
              <button onClick={handleApplyTune} disabled={tuning} className="btn-primary btn w-full tap-target gap-2">
                {tuning ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <SlidersHorizontal size={15} />}
                {tuneResult ? 'Re-tune' : 'Tune my plan'}
              </button>
              {tuneResult && prevPlanSnapshot && (
                <button onClick={() => { undoGenerate(); setTuneResult(null); toast.success('Reverted') }} className="btn-secondary btn w-full tap-target gap-2">
                  <Undo2 size={15} /> Undo tune
                </button>
              )}
              <button onClick={() => { setShowTune(false); setTuneConfirmClear(false) }} className="btn-ghost btn w-full tap-target">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Regenerate confirmation ════════ */}
      {showRegenModal && (
        <div className="app-modal modal-safe"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && setShowRegenModal(false)}>
          <div className="app-modal-card">
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-center rounded-2xl mb-4"
                style={{ width: 48, height: 48, background: 'var(--brand-light)' }}>
                <Wand2 size={22} style={{ color: 'var(--brand)' }} />
              </div>
              <h3 className="font-display font-semibold" style={{ fontSize: 20, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Replace this week's plan?
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.55 }}>
                Your current plan is auto-saved, but generating a new one will replace it for good. Want to save this one to your library first so you can come back to it?
              </p>
            </div>
            <div className="px-6 pt-2 pb-3">
              <input className="input" placeholder="Name to save this plan (optional)"
                value={regenSaveName} onChange={e => setRegenSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveThenGenerate()} />
            </div>
            <div className="px-6 pb-6 flex flex-col gap-2">
              <button onClick={handleSaveThenGenerate} disabled={saving} className="btn-primary btn w-full gap-2 tap-target">
                {saving ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Save size={16} />}
                Save it, then generate new
              </button>
              <button onClick={doGenerate} disabled={saving} className="btn-secondary btn w-full gap-2 tap-target">
                <Wand2 size={15} /> Replace without saving
              </button>
              <button onClick={() => setShowRegenModal(false)} disabled={saving} className="btn-ghost btn w-full tap-target">
                Cancel
              </button>
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
        <RecipeDetailModal
          meal={allMeals.find(m => m.id === viewMeal.meal?.id) || viewMeal.meal}
          onClose={() => setViewMeal(null)}
          onToggleFavorite={(m) => m.id && toggleFavorite(m.id, m.is_favorite)}
          onSwap={() => { openSwap(viewMeal.dayIdx, viewMeal.category); setViewMeal(null) }}
          onMove={() => { openMove(viewMeal.dayIdx, viewMeal.category); setViewMeal(null) }}
          onEdit={(m) => {
            if (!m?.id) return   // can't edit eating-out/leftovers placeholders
            setEditInline({
              id: m.id,
              name: m.item_name || '',
              category: m.category || 'Dinner',
              diet_type: m.diet_type || 'veg',
              ingredients: m.ingredients || '',
            })
            setViewMeal(null)
          }}
        />
      )}
    </div>
  )
}

// ── Tune result row: achieved vs target with honest gap ───────────────
function TuneRow({ label, achieved, target, unit }) {
  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0
  const diff = achieved - target
  const close = Math.abs(diff) / target <= 0.08   // within 8% = "on target"
  const color = close ? 'var(--success)' : 'var(--accent)'
  return (
    <div>
      <div className="flex justify-between items-baseline" style={{ fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
        <span className="nums" style={{ color: 'var(--text)', fontWeight: 600 }}>
          {achieved.toLocaleString()}{unit} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/ {target.toLocaleString()}{unit} goal</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
      <p style={{ fontSize: 11, color: close ? 'var(--success)' : 'var(--text-3)', marginTop: 4 }}>
        {close ? 'On target' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}${unit} vs goal`}
      </p>
    </div>
  )
}

// ── Nutrition goal progress bar ───────────────────────────────────────
function GoalBar({ label, current, goal, unit }) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  const over = current > goal
  const color = over ? 'var(--danger)' : pct >= 80 ? 'var(--success)' : 'var(--accent)'
  return (
    <div>
      <div className="flex justify-between" style={{ fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-3)' }}>{label}</span>
        <span className="nums" style={{ color: 'var(--text-2)', fontWeight: 600 }}>
          {current.toLocaleString()}{unit} / {goal.toLocaleString()}{unit}
          {over && <span style={{ color: 'var(--danger)' }}> · over</span>}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
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
function EmptyPlan({ generating, onGenerate, mealCount, hasSavedPlans, onLoadSaved, onAddStarters, seeding, starterCount, onGoToRecipes }) {
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
      {mealCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl p-5 w-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            You don't have any recipes yet. Add a starter set to generate your first plan instantly.
          </p>
          <button onClick={onAddStarters} disabled={seeding}
            className="btn-primary btn tap-target gap-2 w-full">
            {seeding ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Sparkles size={16} />}
            {seeding ? 'Adding…' : `Add ${starterCount} starter recipes`}
          </button>
          <button onClick={onGoToRecipes} className="btn-ghost btn gap-2 w-full" style={{ fontSize: 13 }}>
            <BookOpen size={15} /> Or add your own
          </button>
        </div>
      ) : (
        hasSavedPlans && (
          <button onClick={onLoadSaved} className="btn-ghost btn gap-2" style={{ fontSize: 13.5 }}>
            <Bookmark size={15} /> Or load a saved plan
          </button>
        )
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
    <div className="app-modal modal-safe"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="app-modal-card" style={{ maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}>
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
