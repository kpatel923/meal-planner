import { createContext, useContext, useState, useCallback } from 'react'
import { buildWeeklyPlan } from '../lib/mealLogic'

// Global plan state — survives tab navigation because it lives above the router outlets
const PlanContext = createContext(null)

export function PlanProvider({ children }) {
  const [weeklyPlan,  setWeeklyPlan]  = useState(null)
  const [dietTypes,   setDietTypes]   = useState(['veg','vegan','nonveg'])
  const [generating,  setGenerating]  = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  const generate = useCallback((meals) => {
    setGenerating(true)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const plan = buildWeeklyPlan(meals)
          setWeeklyPlan(plan)
          setExpandedDay(0)
          // persist to sessionStorage for GroceryPage
          try { sessionStorage.setItem('mealplan_current', JSON.stringify(plan)) } catch {}
          setGenerating(false)
          resolve(plan)
        } catch (e) {
          setGenerating(false)
          reject(e)
        }
      }, 600)
    })
  }, [])

  const swapMeal = useCallback((dayIdx, category, newMeal) => {
    setWeeklyPlan(prev => {
      if (!prev) return prev
      const next = { ...prev, [dayIdx]: { ...prev[dayIdx], [category]: newMeal } }
      try { sessionStorage.setItem('mealplan_current', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const loadPlan = useCallback((plan) => {
    setWeeklyPlan(plan)
    try { sessionStorage.setItem('mealplan_current', JSON.stringify(plan)) } catch {}
    setExpandedDay(0)
  }, [])

  const clearPlan = useCallback(() => {
    setWeeklyPlan(null)
    try { sessionStorage.removeItem('mealplan_current') } catch {}
  }, [])

  return (
    <PlanContext.Provider value={{
      weeklyPlan, generating, dietTypes, expandedDay,
      setDietTypes, setExpandedDay,
      generate, swapMeal, loadPlan, clearPlan,
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
