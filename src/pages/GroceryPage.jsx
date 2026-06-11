import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '../hooks/usePlans'
import { buildGroceryList, DAYS, CATEGORIES, CATEGORY_ICONS } from '../lib/mealLogic'
import {
  ShoppingCart, CheckSquare, Square, ChevronDown,
  RefreshCcw, Download, Loader2, Info
} from 'lucide-react'

// We store the active weekly plan in sessionStorage so GroceryPage
// can read it even after navigating away from PlannerPage.
// PlannerPage writes to sessionStorage on every plan generation.
const SESSION_KEY = 'mealplan_current'

function loadPlanFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePlanToSession(plan) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(plan))
  } catch {}
}

export default function GroceryPage() {
  const navigate   = useNavigate()
  const { plans, loading: plansLoading, loadPlan } = usePlans()

  const [weeklyPlan, setWeeklyPlan] = useState(() => loadPlanFromSession())
  const [checked,    setChecked]    = useState({})   // { ingredient: true/false }
  const [showMeals,  setShowMeals]  = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  // Build grocery map from active plan
  const groceryMap = useMemo(() => {
    if (!weeklyPlan) return {}
    return buildGroceryList(weeklyPlan)
  }, [weeklyPlan])

  const sortedIngredients = useMemo(() =>
    Object.keys(groceryMap).sort(), [groceryMap]
  )

  const checkedCount = sortedIngredients.filter(i => checked[i]).length

  // ── Handlers ─────────────────────────────────────────────
  function toggle(ingredient) {
    setChecked(prev => ({ ...prev, [ingredient]: !prev[ingredient] }))
  }

  function selectAll()  { setChecked(Object.fromEntries(sortedIngredients.map(i => [i, true])))  }
  function clearAll()   { setChecked({}) }

  function handleLoadSavedPlan(planId) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    const loaded = loadPlan(plan)
    setWeeklyPlan(loaded)
    setChecked({})
    setSelectedPlanId(planId)
  }

  function exportChecklist() {
    const lines = [
      '# Grocery List',
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      ...sortedIngredients.map(i => {
        const status = checked[i] ? '[x]' : '[ ]'
        const meals  = groceryMap[i]?.slice(0, 3).join(', ') || ''
        return `${status} ${i.charAt(0).toUpperCase() + i.slice(1)}  (${meals})`
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'grocery-list.txt'
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Empty state ───────────────────────────────────────────
  if (!weeklyPlan) {
    return (
      <div className="page-container animate-fade-in">
        <h1 className="section-title mb-2">Grocery List</h1>
        <p className="text-sage-500 text-sm mb-8">
          Generate a weekly plan first, or load a saved one below.
        </p>

        <div className="card p-6 flex flex-col items-center text-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-sage-100 flex items-center justify-center">
            <ShoppingCart size={28} className="text-sage-400" />
          </div>
          <div>
            <h3 className="font-display text-lg text-sage-800 mb-1">No active plan</h3>
            <p className="text-sm text-sage-400">
              Head to the Planner tab to generate a week, then come back here.
            </p>
          </div>
          <button onClick={() => navigate('/planner')} className="btn-primary btn">
            Go to Planner
          </button>
        </div>

        {/* Load from saved */}
        {!plansLoading && plans.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-sage-800 mb-3 text-sm">Or load a saved plan</h3>
            <div className="space-y-2">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => handleLoadSavedPlan(plan.id)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-cream-200 hover:border-sage-300 hover:bg-sage-50 transition-all text-sm"
                >
                  <span className="font-medium text-sage-800">{plan.name}</span>
                  <span className="text-sage-400 ml-2 text-xs">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Main grocery list ─────────────────────────────────────
  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title">Grocery List</h1>
          <p className="text-sage-500 text-sm mt-1">
            {checkedCount} of {sortedIngredients.length} items checked
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportChecklist} className="btn-secondary btn-sm btn">
            <Download size={14} /> Export
          </button>
          <button onClick={() => { setWeeklyPlan(null); setChecked({}) }} className="btn-ghost btn-sm btn">
            <RefreshCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-sage-600">Shopping progress</span>
          <span className="text-xs text-sage-400">
            {sortedIngredients.length > 0
              ? Math.round((checkedCount / sortedIngredients.length) * 100)
              : 0}%
          </span>
        </div>
        <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-sage-500 rounded-full transition-all duration-300"
            style={{ width: `${sortedIngredients.length > 0 ? (checkedCount / sortedIngredients.length) * 100 : 0}%` }}
          />
        </div>
        {checkedCount === sortedIngredients.length && sortedIngredients.length > 0 && (
          <p className="text-center text-sage-600 text-sm font-medium mt-2 animate-fade-in">
            🎉 All done! Happy cooking.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={selectAll} className="btn-secondary btn-sm btn">
          <CheckSquare size={14} /> Select all
        </button>
        <button onClick={clearAll} className="btn-secondary btn-sm btn">
          <Square size={14} /> Clear all
        </button>
        <button
          onClick={() => setShowMeals(v => !v)}
          className={`btn-sm btn ${showMeals ? 'btn-secondary' : 'btn-ghost'}`}
        >
          <Info size={14} />
          {showMeals ? 'Hide meal info' : 'Show meal info'}
        </button>

        {/* Load different plan */}
        {plans.length > 0 && (
          <div className="relative">
            <select
              className="input text-xs py-1.5 pr-8"
              value={selectedPlanId}
              onChange={e => handleLoadSavedPlan(e.target.value)}
            >
              <option value="">Load a saved plan…</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grocery items */}
      <div className="card divide-y divide-cream-100 overflow-hidden">
        {sortedIngredients.length === 0 ? (
          <div className="p-8 text-center text-sage-400 text-sm">No ingredients found.</div>
        ) : (
          sortedIngredients.map(ingredient => {
            const isChecked = !!checked[ingredient]
            const meals     = groceryMap[ingredient] || []

            return (
              <button
                key={ingredient}
                onClick={() => toggle(ingredient)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-cream-50 ${
                  isChecked ? 'bg-sage-50' : 'bg-white'
                }`}
              >
                <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  isChecked
                    ? 'bg-sage-500 border-sage-500'
                    : 'border-cream-300'
                }`}>
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium capitalize transition-all ${
                    isChecked ? 'line-through text-sage-400' : 'text-sage-900'
                  }`}>
                    {ingredient}
                  </p>
                  {showMeals && meals.length > 0 && (
                    <p className={`text-xs mt-0.5 transition-all ${
                      isChecked ? 'text-sage-300' : 'text-sage-400'
                    }`}>
                      {meals.slice(0, 3).join(' · ')}
                      {meals.length > 3 && ` +${meals.length - 3} more`}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-xs text-sage-300 font-mono mt-0.5">
                  ×{meals.length}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
