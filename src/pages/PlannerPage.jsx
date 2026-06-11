import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { usePlans } from '../hooks/usePlans'
import { useAuth } from '../hooks/useAuth'
import { buildWeeklyPlan, DAYS, CATEGORIES, CATEGORY_ICONS, DIET_LABELS } from '../lib/mealLogic'
import { exportToPDF } from '../lib/pdfExport'
import { savePlanToSession } from './GroceryPage'
import {
  RefreshCw, Download, Save, ChevronDown,
  ChevronUp, Loader2, Salad, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const DIET_FILTERS = [
  { key: 'veg',    label: 'Veg'     },
  { key: 'vegan',  label: 'Vegan'   },
  { key: 'nonveg', label: 'Non-Veg' },
]

export default function PlannerPage() {
  const { profile } = useAuth()
  const [dietTypes,   setDietTypes]   = useState(['veg','vegan','nonveg'])
  const [weeklyPlan,  setWeeklyPlan]  = useState(null)
  const [generating,  setGenerating]  = useState(false)
  const [planName,    setPlanName]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const { meals, loading: mealsLoading } = useMeals({ diet_types: dietTypes })
  const { savePlan } = usePlans()
  const navigate = useNavigate()

  function toggleDiet(key) {
    setDietTypes(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  function handleGenerateClick() {
    if (weeklyPlan && !confirmRegen) {
      setConfirmRegen(true)
      return
    }
    generatePlan()
    setConfirmRegen(false)
  }

  function generatePlan() {
    if (dietTypes.length === 0) {
      toast.error('Select at least one diet type')
      return
    }
    setGenerating(true)
    setTimeout(() => {
      try {
        const plan = buildWeeklyPlan(meals)
        setWeeklyPlan(plan)
        savePlanToSession(plan)
        setExpandedDay(0)
      } catch (err) {
        toast.error('Not enough meals for selected diet. Add more recipes first.')
      }
      setGenerating(false)
    }, 400) // small delay for UX feel
  }

  async function handleSave() {
    if (!weeklyPlan) return
    if (!planName.trim()) {
      toast.error('Give your plan a name first')
      return
    }
    setSaving(true)
    await savePlan(planName.trim(), weeklyPlan)
    setPlanName('')
    setSaving(false)
  }

  function handleExportPDF() {
    if (!weeklyPlan) return
    exportToPDF(weeklyPlan, profile?.username || 'Your')
    toast.success('PDF exported!')
  }

  // Summary stats
  const stats = useMemo(() => {
    if (!weeklyPlan) return null
    const allIngredients = new Set()
    let mealCount = 0
    Object.values(weeklyPlan).forEach(day => {
      Object.values(day).forEach(meal => {
        mealCount++
        meal.ingredients?.split(',').forEach(i => allIngredients.add(i.trim().toLowerCase()))
      })
    })
    return { mealCount, ingredientCount: allIngredients.size }
  }, [weeklyPlan])

  if (mealsLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-sage-400" size={32} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">Weekly Planner</h1>
          <p className="text-sage-500 text-sm mt-1">
            {meals.length} meals in your library
          </p>
        </div>

        {weeklyPlan && (
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportPDF} className="btn-secondary btn-sm btn">
              <Download size={14} /> PDF
            </button>
            <button onClick={() => navigate('/grocery')} className="btn-secondary btn-sm btn">
              🛒 Grocery List
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="card p-4 sm:p-5 mb-6 space-y-4">
        {/* Diet Filter */}
        <div>
          <p className="input-label mb-2">Diet preferences</p>
          <div className="flex flex-wrap gap-2">
            {DIET_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleDiet(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ` +
                  (dietTypes.includes(key)
                    ? 'bg-sage-600 text-white border-sage-600'
                    : 'bg-white text-sage-500 border-cream-300 hover:border-sage-300')
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <div className="flex flex-col sm:flex-row gap-3">
          {confirmRegen ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-clay-600">Overwrite current plan?</span>
              <button
                onClick={() => { generatePlan(); setConfirmRegen(false) }}
                className="btn-danger btn-sm btn"
              >Yes, regenerate</button>
              <button
                onClick={() => setConfirmRegen(false)}
                className="btn-secondary btn-sm btn"
              >Keep current</button>
            </div>
          ) : (
            <button
              onClick={handleGenerateClick}
              disabled={generating || dietTypes.length === 0}
              className="btn-primary btn"
            >
              {generating
                ? <Loader2 size={16} className="animate-spin" />
                : <RefreshCw size={16} />}
              {weeklyPlan ? 'Regenerate Week' : 'Generate Week'}
            </button>
          )}

          {weeklyPlan && (
            <div className="flex gap-2 flex-1">
              <input
                className="input flex-1"
                placeholder="Name this plan…"
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={saving || !planName.trim()}
                className="btn-primary btn"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!weeklyPlan && (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-sage-100 flex items-center justify-center mb-4">
            <Salad size={36} className="text-sage-500" />
          </div>
          <h3 className="font-display text-xl text-sage-800 mb-2">No plan yet</h3>
          <p className="text-sage-400 text-sm max-w-xs">
            Click <strong>Generate Week</strong> above to build your personalized 7-day meal plan.
          </p>
        </div>
      )}

      {/* Stats bar */}
      {weeklyPlan && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-slide-up">
          {[
            { label: 'Days planned', value: '7' },
            { label: 'Total meals',  value: stats.mealCount },
            { label: 'Ingredients',  value: stats.ingredientCount },
            { label: 'Diet types',   value: dietTypes.length },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <p className="font-display text-2xl text-sage-700">{s.value}</p>
              <p className="text-xs text-sage-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Daily Cards */}
      {weeklyPlan && (
        <div className="space-y-3">
          {DAYS.map((dayName, dayIdx) => {
            const dayMeals = weeklyPlan[dayIdx] || {}
            const isOpen   = expandedDay === dayIdx

            return (
              <div key={dayName} className="card overflow-hidden animate-slide-up"
                style={{ animationDelay: `${dayIdx * 0.04}s` }}>
                {/* Day header */}
                <button
                  onClick={() => setExpandedDay(isOpen ? null : dayIdx)}
                  className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-cream-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-base text-sage-900 font-semibold">
                      {dayName}
                    </span>
                    <div className="hidden sm:flex gap-1.5">
                      {CATEGORIES.map(cat => {
                        const meal = dayMeals[cat]
                        return meal ? (
                          <span key={cat} className="text-base" title={`${cat}: ${meal.item_name}`}>
                            {CATEGORY_ICONS[cat]}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-sage-400" /> : <ChevronDown size={16} className="text-sage-400" />}
                </button>

                {/* Meal grid */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-cream-100">
                    {CATEGORIES.map(category => {
                      const meal = dayMeals[category]
                      const diet = meal ? DIET_LABELS[meal.diet_type] : null

                      return (
                        <div
                          key={category}
                          className={`rounded-xl border p-3 mt-3 ${
                            category === 'Breakfast' ? 'cat-breakfast' :
                            category === 'Lunch'     ? 'cat-lunch'     :
                            category === 'Dinner'    ? 'cat-dinner'    :
                                                       'cat-snack'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-base">{CATEGORY_ICONS[category]}</span>
                            <span className="text-xs font-semibold text-sage-600 uppercase tracking-wide">
                              {category}
                            </span>
                          </div>

                          {meal ? (
                            <>
                              <p className="font-semibold text-sage-900 text-sm leading-tight mb-2">
                                {meal.item_name}
                              </p>
                              <p className="text-xs text-sage-500 leading-relaxed mb-2">
                                {meal.ingredients?.split(',').map(i => i.trim()).slice(0,4).join(', ')}
                                {meal.ingredients?.split(',').length > 4 ? '…' : ''}
                              </p>
                              {diet && (
                                <span className={`badge ${diet.color}`}>{diet.label}</span>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-1 text-sage-400 text-xs">
                              <AlertCircle size={12} />
                              No meal assigned
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
