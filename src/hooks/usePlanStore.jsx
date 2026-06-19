import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { buildWeeklyPlan } from '../lib/mealLogic'

const PlanContext = createContext(null)
const SERVINGS_KEY = 'mealplan_servings'

function loadStoredServings() {
  try {
    const stored = localStorage.getItem(SERVINGS_KEY)
    const n = parseInt(stored, 10)
    return (n >= 1 && n <= 20) ? n : 2
  } catch { return 2 }
}

export function PlanProvider({ children }) {
  const [weeklyPlan,   setWeeklyPlan]   = useState(null)
  const [dietTypes,    setDietTypes]    = useState(['veg','vegan','nonveg'])
  const [servings,     setServingsRaw]  = useState(loadStoredServings)
  const [generating,   setGenerating]   = useState(false)
  const [expandedDay,  setExpandedDay]  = useState(null)
  const [prepChecked,  setPrepChecked]  = useState({})   // { "0-Breakfast": true }
  const [undoStack,    setUndoStack]    = useState([])   // for undo swap
  const [planDesc,     setPlanDesc]     = useState(null) // AI description
  const undoTimerRef = useRef(null)

  // Persist servings choice across sessions — this is a "how many people
  // am I usually cooking for" preference, not tied to any one plan
  const setServings = useCallback((n) => {
    const clamped = Math.min(20, Math.max(1, n))
    setServingsRaw(clamped)
    try { localStorage.setItem(SERVINGS_KEY, String(clamped)) } catch {}
  }, [])

  function persistPlan(plan) {
    try { sessionStorage.setItem('mealplan_current', JSON.stringify(plan)) } catch {}
  }

  const generate = useCallback((meals) => {
    setGenerating(true)
    setPlanDesc(null)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const plan = buildWeeklyPlan(meals)
          setWeeklyPlan(plan)
          setExpandedDay(0)
          setPrepChecked({})
          setUndoStack([])
          persistPlan(plan)
          setGenerating(false)
          resolve(plan)
        } catch (e) {
          setGenerating(false)
          reject(e)
        }
      }, 600)
    })
  }, [])

  // Regenerate a single day only
  const regenerateDay = useCallback((dayIdx, meals) => {
    setWeeklyPlan(prev => {
      if (!prev) return prev
      // Build a temp plan just to get 4 meals for that day
      try {
        const tempPlan = buildWeeklyPlan(meals)
        const newDayMeals = tempPlan[0] // take day 0 from temp plan
        const next = { ...prev, [dayIdx]: newDayMeals }
        persistPlan(next)
        return next
      } catch { return prev }
    })
  }, [])

  const swapMeal = useCallback((dayIdx, category, newMeal) => {
    setWeeklyPlan(prev => {
      if (!prev) return prev
      // Save to undo stack before swapping
      const oldMeal = prev[dayIdx]?.[category]
      setUndoStack(stack => {
        // Clear existing timer
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
        // Auto-clear undo after 8 seconds
        undoTimerRef.current = setTimeout(() => setUndoStack([]), 8000)
        return [{ dayIdx, category, oldMeal, newMeal }]
      })
      const next = { ...prev, [dayIdx]: { ...prev[dayIdx], [category]: newMeal } }
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
  }, [])

  const clearPlan = useCallback(() => {
    setWeeklyPlan(null)
    setPrepChecked({})
    setUndoStack([])
    setPlanDesc(null)
    try { sessionStorage.removeItem('mealplan_current') } catch {}
  }, [])

  // Meal prep tracking
  const togglePrep = useCallback((dayIdx, category) => {
    const key = `${dayIdx}-${category}`
    setPrepChecked(prev => ({ ...prev, [key]: !prev[key] }))
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
      prepChecked, undoStack, planDesc,
      setDietTypes, setExpandedDay, setPlanDesc, setServings,
      generate, regenerateDay, swapMeal, undoSwap, clearUndo,
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
