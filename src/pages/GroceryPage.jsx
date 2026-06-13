import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '../hooks/usePlans'
import { usePlanStore } from '../hooks/usePlanStore'
import { buildGroceryList } from '../lib/mealLogic'
import { ShoppingCart, CheckCircle2, Square, Download, Info, Sparkles, ArrowRight } from 'lucide-react'

export function savePlanToSession(plan) {
  try { sessionStorage.setItem('mealplan_current', JSON.stringify(plan)) } catch {}
}
export function loadPlanFromSession() {
  try { return JSON.parse(sessionStorage.getItem('mealplan_current') || 'null') } catch { return null }
}

export default function GroceryPage() {
  const navigate = useNavigate()
  const { plans, loadPlan: loadSavedPlan } = usePlans()
  const { weeklyPlan, loadPlan: storeLoadPlan } = usePlanStore()
  const [checked,        setChecked]        = useState({})
  const [showMeals,      setShowMeals]      = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const groceryMap   = useMemo(() => weeklyPlan ? buildGroceryList(weeklyPlan) : {}, [weeklyPlan])
  const ingredients  = useMemo(() => Object.keys(groceryMap).sort(), [groceryMap])
  const checkedCount = ingredients.filter(i => checked[i]).length
  const progress     = ingredients.length ? Math.round((checkedCount / ingredients.length) * 100) : 0

  function toggle(ing)  { setChecked(p => ({ ...p, [ing]: !p[ing] })) }
  function selectAll()  { setChecked(Object.fromEntries(ingredients.map(i => [i, true]))) }
  function clearAll()   { setChecked({}) }

  function handleLoadPlan(id) {
    const plan = plans.find(p => p.id === id)
    if (!plan) return
    storeLoadPlan(loadSavedPlan(plan))
    setChecked({})
    setSelectedPlanId(id)
  }

  function exportTxt() {
    const lines = [
      '# Grocery List',
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      ...ingredients.map(i => `${checked[i] ? '[x]' : '[ ]'} ${i.charAt(0).toUpperCase() + i.slice(1)}`)
    ]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }))
    a.download = 'grocery-list.txt'
    a.click()
  }

  // ── Empty state ────────────────────────────────────────
  if (!weeklyPlan) return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease' }}>
      <span className="page-eyebrow">Grocery List</span>
      <h1 className="section-title mb-2">What to buy</h1>
      <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '32px' }}>
        Generate a plan first, or load a saved one below.
      </p>

      <div className="card p-10 flex flex-col items-center text-center mb-5"
        style={{ animation: 'slideUp 0.4s ease' }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: 'linear-gradient(135deg,rgba(31,158,98,0.1),rgba(31,158,98,0.04))', border: '1.5px solid rgba(31,158,98,0.15)', animation: 'float 3s ease-in-out infinite' }}>
          <ShoppingCart size={32} style={{ color: 'var(--brand)' }} />
        </div>
        <h3 className="font-display font-semibold mb-2" style={{ fontSize: '22px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
          No plan active yet
        </h3>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '24px', maxWidth: '320px' }}>
          Head to the Planner, generate your week, then come back here for your full grocery list.
        </p>
        <button onClick={() => navigate('/planner')} className="btn-primary btn btn-lg">
          <Sparkles size={17} /> Go to Planner <ArrowRight size={16} />
        </button>
      </div>

      {plans.length > 0 && (
        <div className="card p-6" style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
          <p className="font-semibold mb-4" style={{ fontSize: '16px', color: 'var(--text)' }}>
            Or load a saved plan
          </p>
          <div className="space-y-2">
            {plans.map(plan => (
              <button key={plan.id} onClick={() => handleLoadPlan(plan.id)}
                className="w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <span className="font-semibold" style={{ fontSize: '15px' }}>{plan.name}</span>
                <span className="ml-3" style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                  {new Date(plan.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Main grocery list ──────────────────────────────────
  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <span className="page-eyebrow">Grocery List</span>
          <h1 className="section-title">What to buy</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '15px', marginTop: '6px' }}>
            {checkedCount} of {ingredients.length} items checked
          </p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={exportTxt} className="btn-secondary btn">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Progress card */}
      <div className="card p-5 mb-5" style={{ animation: 'slideUp 0.4s ease 0.05s both' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold" style={{ fontSize: '15px', color: 'var(--text)' }}>
            Shopping progress
          </span>
          <span className="font-mono font-bold" style={{ fontSize: '22px', color: 'var(--brand)', letterSpacing: '-0.04em' }}>
            {progress}%
          </span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: '10px', background: 'var(--surface-2)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#1F9E62,#3AB87D)', boxShadow: progress > 0 ? '0 0 12px rgba(31,158,98,0.4)' : 'none' }} />
        </div>
        {progress === 100 && (
          <p className="text-center font-semibold mt-4" style={{ fontSize: '16px', color: 'var(--brand)', animation: 'scaleIn 0.3s ease' }}>
            🎉 All done! Happy cooking.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2.5 mb-5" style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
        <button onClick={selectAll} className="btn-secondary btn">
          <CheckCircle2 size={16} /> Select all
        </button>
        <button onClick={clearAll} className="btn-secondary btn">
          <Square size={16} /> Clear all
        </button>
        <button onClick={() => setShowMeals(v => !v)} className="btn"
          style={{
            background: showMeals ? 'rgba(31,158,98,0.1)' : 'var(--surface)',
            border: `1.5px solid ${showMeals ? 'rgba(31,158,98,0.3)' : 'var(--border)'}`,
            color: showMeals ? 'var(--brand)' : 'var(--text-3)',
          }}>
          <Info size={16} /> {showMeals ? 'Hide' : 'Show'} meal info
        </button>
        {plans.length > 0 && (
          <select className="input" style={{ width: 'auto', fontSize: '14px' }}
            value={selectedPlanId} onChange={e => handleLoadPlan(e.target.value)}>
            <option value="">Switch to saved plan…</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Ingredient list */}
      <div className="card overflow-hidden" style={{ animation: 'slideUp 0.4s ease 0.15s both' }}>
        {ingredients.length === 0 ? (
          <div className="p-10 text-center" style={{ color: 'var(--text-3)', fontSize: '15px' }}>No ingredients found.</div>
        ) : (
          ingredients.map((ing, idx) => {
            const done  = !!checked[ing]
            const meals = groceryMap[ing] || []
            return (
              <button key={ing} onClick={() => toggle(ing)}
                className="w-full flex items-start gap-4 px-5 py-4 text-left transition-all duration-150 group"
                style={{
                  borderBottom: idx < ingredients.length - 1 ? '1px solid var(--border)' : 'none',
                  background: done ? 'rgba(31,158,98,0.04)' : 'transparent',
                }}
                onMouseEnter={e => { if (!done) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = done ? 'rgba(31,158,98,0.04)' : 'transparent' }}>

                {/* Checkbox */}
                <div className="shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200"
                  style={{
                    width: '22px', height: '22px', borderRadius: '7px',
                    border: done ? 'none' : '2px solid var(--border)',
                    background: done ? 'linear-gradient(135deg,#1F9E62,#167D4D)' : 'var(--surface)',
                    boxShadow: done ? '0 2px 10px rgba(31,158,98,0.35)' : 'none',
                    transform: done ? 'scale(1.05)' : 'scale(1)',
                  }}>
                  {done && (
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium capitalize transition-all duration-200"
                    style={{
                      fontSize: '15px',
                      color: done ? 'var(--text-3)' : 'var(--text)',
                      textDecoration: done ? 'line-through' : 'none',
                      textDecorationColor: 'var(--text-3)',
                    }}>
                    {ing}
                  </p>
                  {showMeals && meals.length > 0 && (
                    <p className="mt-0.5 transition-colors duration-200"
                      style={{ fontSize: '12px', color: done ? 'var(--border)' : 'var(--text-3)' }}>
                      {meals.slice(0, 3).join(' · ')}{meals.length > 3 ? ` +${meals.length - 3} more` : ''}
                    </p>
                  )}
                </div>

                {/* Count badge */}
                <span className="shrink-0 font-mono font-semibold px-2 py-0.5 rounded-lg"
                  style={{ fontSize: '12px', color: done ? 'var(--border)' : 'var(--text-3)', background: 'var(--surface-2)' }}>
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
