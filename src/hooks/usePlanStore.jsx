import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { buildWeeklyPlan } from '../lib/mealLogic'
import { getRecentlyUsedMeals, applyAvoidRepeats, recordMealsUsed } from '../lib/avoidRepeats'

const PlanContext = createContext(null)
const SERVINGS_KEY = 'mealplan_servings'
const PLAN_KEY = 'mealplan_active'        // the auto-saved active plan (survives app close)
const PREP_KEY = 'mealplan_active_prep'   // prep checkboxes for the active plan

function loadStoredServings() {
  try {
    const stored = localStorage.getItem(SERVINGS_KEY)
    const n = parseInt(stored, 10)
    return (n >= 1 && n <= 20) ? n : 2
  } catch { return 2 }
}

// Auto-saved plan persists across app launches (localStorage, not session).
function loadStoredPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function loadStoredPrep() {
  try {
    const raw = localStorage.getItem(PREP_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function PlanProvider({ children }) {
  const [weeklyPlan,    setWeeklyPlan]    = useState(loadStoredPlan)
  const [dietTypes,     setDietTypes]     = useState(['veg','vegan','nonveg'])
  const [servings,      setServingsRaw]   = useState(loadStoredServings)
  const [generating,    setGenerating]    = useState(false)
  const [expandedDay,   setExpandedDay]   = useState(null)
  const [prepChecked,   setPrepChecked]   = useState(loadStoredPrep)   // { "0-Breakfast": true }
  const [undoStack,     setUndoStack]     = useState([])   // for undo swap
  const [planDesc,      setPlanDesc]      = useState(null) // AI description
  const [avoidRepeats,  setAvoidRepeats]  = useState(true) // toggle for the feature
  const [prevPlanSnapshot, setPrevPlanSnapshot] = useState(null) // for undo-generate
  const [dayUndo,          setDayUndo]          = useState(null)  // for undo regen-day { dayIdx, meals }
  const undoTimerRef      = useRef(null)
  const undoGenTimerRef   = useRef(null)
  const dayUndoTimerRef   = useRef(null)

  const setServings = useCallback((n) => {
    const clamped = Math.min(20, Math.max(1, n))
    setServingsRaw(clamped)
    try { localStorage.setItem(SERVINGS_KEY, String(clamped)) } catch {}
  }, [])

  // Auto-save the active plan to localStorage so it's restored on next launch.
  function persistPlan(plan) {
    try {
      if (plan) localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
      else localStorage.removeItem(PLAN_KEY)
    } catch {}
  }
  function persistPrep(prep) {
    try { localStorage.setItem(PREP_KEY, JSON.stringify(prep || {})) } catch {}
  }

  // generate() now optionally takes a userId to apply avoid-repeats logic.
  // Snapshots the previous plan so generate can be undone.
  const generate = useCallback(async (meals, userId = null, budgetMode = false) => {
    setGenerating(true)
    setPlanDesc(null)

    let pool = meals
    if (avoidRepeats && userId) {
      try {
        const recent = await getRecentlyUsedMeals(userId, 14)
        pool = applyAvoidRepeats(meals, recent)
      } catch { /* fall back to unfiltered pool on error */ }
    }

    // Build synchronously — buildWeeklyPlan is sub-millisecond, so there's
    // no reason to stall behind a 600ms timer. We defer to a macrotask (0ms)
    // so React can paint the loading state first; unlike requestAnimationFrame
    // this still fires reliably when the tab is backgrounded.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const plan = buildWeeklyPlan(pool, { budgetMode })
          setWeeklyPlan(prevPlan => {
            // snapshot for undo-generate, separate from undo-swap
            if (prevPlan) {
              setPrevPlanSnapshot(prevPlan)
              if (undoGenTimerRef.current) clearTimeout(undoGenTimerRef.current)
              undoGenTimerRef.current = setTimeout(() => setPrevPlanSnapshot(null), 10000)
            }
            return plan
          })
          setExpandedDay(0)
          setPrepChecked({})
          persistPrep({})
          setUndoStack([])
          persistPlan(plan)
          setGenerating(false)
          // Fire-and-forget: record usage for future avoid-repeats
          if (userId) recordMealsUsed(userId, plan).catch(() => {})
          resolve(plan)
        } catch (e) {
          setGenerating(false)
          reject(e)
        }
      }, 0)
    })
  }, [avoidRepeats])

  const undoGenerate = useCallback(() => {
    if (!prevPlanSnapshot) return
    if (undoGenTimerRef.current) clearTimeout(undoGenTimerRef.current)
    setWeeklyPlan(prevPlanSnapshot)
    persistPlan(prevPlanSnapshot)
    setPrevPlanSnapshot(null)
  }, [prevPlanSnapshot])

  const clearUndoGenerate = useCallback(() => {
    if (undoGenTimerRef.current) clearTimeout(undoGenTimerRef.current)
    setPrevPlanSnapshot(null)
  }, [])

  // Regenerate a single day only
  const regenerateDay = useCallback((dayIdx, meals, budgetMode = false) => {
    setWeeklyPlan(prev => {
      if (!prev) return prev
      try {
        const tempPlan = buildWeeklyPlan(meals, { budgetMode })
        const newDayMeals = tempPlan[0]
        // Snapshot the day's previous meals so it can be undone.
        setDayUndo({ dayIdx, meals: prev[dayIdx] || {} })
        if (dayUndoTimerRef.current) clearTimeout(dayUndoTimerRef.current)
        dayUndoTimerRef.current = setTimeout(() => setDayUndo(null), 10000)
        const next = { ...prev, [dayIdx]: newDayMeals }
        persistPlan(next)
        return next
      } catch { return prev }
    })
  }, [])

  const undoRegenerateDay = useCallback(() => {
    setDayUndo(prevUndo => {
      if (!prevUndo) return null
      if (dayUndoTimerRef.current) clearTimeout(dayUndoTimerRef.current)
      setWeeklyPlan(prev => {
        if (!prev) return prev
        const next = { ...prev, [prevUndo.dayIdx]: prevUndo.meals }
        persistPlan(next)
        return next
      })
      return null
    })
  }, [])

  const clearDayUndo = useCallback(() => {
    if (dayUndoTimerRef.current) clearTimeout(dayUndoTimerRef.current)
    setDayUndo(null)
  }, [])

  const swapMeal = useCallback((dayIdx, category, newMeal) => {
    setWeeklyPlan(prev => {
      if (!prev) return prev
      const oldMeal = prev[dayIdx]?.[category]
      setUndoStack(stack => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
        undoTimerRef.current = setTimeout(() => setUndoStack([]), 8000)
        return [{ dayIdx, category, oldMeal, newMeal }]
      })
      const next = { ...prev, [dayIdx]: { ...prev[dayIdx], [category]: newMeal } }
      persistPlan(next)
      return next
    })
  }, [])

  // Reorder: move a meal from one day/category slot to another (drag-and-drop)
  const reorderMeal = useCallback((fromDayIdx, fromCategory, toDayIdx, toCategory) => {
    setWeeklyPlan(prev => {
      if (!prev) return prev
      const fromMeal = prev[fromDayIdx]?.[fromCategory]
      const toMeal   = prev[toDayIdx]?.[toCategory]
      if (!fromMeal) return prev

      const next = JSON.parse(JSON.stringify(prev))
      next[toDayIdx][toCategory]     = fromMeal
      next[fromDayIdx][fromCategory] = toMeal || null
      persistPlan(next)
      return next
    })
  }, [])

  const undoSwap = useCallback(() => {
    if (!undoStack.length) return
    const { dayIdx, category, oldMeal } = undoStack[0]
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoStack([])
    setWeeklyPlan(prev => {
      if (!prev) return prev
      const next = { ...prev, [dayIdx]: { ...prev[dayIdx], [category]: oldMeal } }
      persistPlan(next)
      return next
    })
  }, [undoStack])

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoStack([])
  }, [])

  const loadPlan = useCallback((plan) => {
    setWeeklyPlan(plan)
    persistPlan(plan)
    setExpandedDay(0)
    setPrepChecked({})
    setUndoStack([])
    setPlanDesc(null)
    setPrevPlanSnapshot(null)
  }, [])

  const clearPlan = useCallback(() => {
    setWeeklyPlan(null)
    setPrepChecked({})
    setUndoStack([])
    setPlanDesc(null)
    setPrevPlanSnapshot(null)
    try {
      localStorage.removeItem(PLAN_KEY)
      localStorage.removeItem(PREP_KEY)
    } catch {}
  }, [])

  const togglePrep = useCallback((dayIdx, category) => {
    const key = `${dayIdx}-${category}`
    setPrepChecked(prev => {
      const next = { ...prev, [key]: !prev[key] }
      persistPrep(next)
      return next
    })
  }, [])

  const isPrepDone = useCallback((dayIdx, category) => {
    return !!prepChecked[`${dayIdx}-${category}`]
  }, [prepChecked])

  const prepProgress = weeklyPlan ? (() => {
    let total = 0, done = 0
    Object.keys(weeklyPlan).forEach(d => {
      Object.keys(weeklyPlan[d]).forEach(cat => {
        total++
        if (prepChecked[`${d}-${cat}`]) done++
      })
    })
    return { total, done, pct: total > 0 ? Math.round((done/total)*100) : 0 }
  })() : { total: 0, done: 0, pct: 0 }

  return (
    <PlanContext.Provider value={{
      weeklyPlan, generating, dietTypes, expandedDay, servings,
      prepChecked, undoStack, planDesc, avoidRepeats, prevPlanSnapshot, dayUndo,
      setDietTypes, setExpandedDay, setPlanDesc, setServings, setAvoidRepeats,
      generate, regenerateDay, undoRegenerateDay, clearDayUndo, swapMeal, reorderMeal, undoSwap, clearUndo,
      undoGenerate, clearUndoGenerate,
      loadPlan, clearPlan, togglePrep, isPrepDone, prepProgress,
    }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlanStore() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlanStore must be inside PlanProvider')
  return ctx
}
