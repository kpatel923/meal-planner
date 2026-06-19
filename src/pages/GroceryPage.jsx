import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '../hooks/usePlans'
import { usePlanStore } from '../hooks/usePlanStore'
import { buildGroceryList } from '../lib/mealLogic'
import { groupGroceryByCategory, GROCERY_CATEGORY_ORDER, estimateQuantity } from '../lib/groceryCategories'
import { buildGroceryShareText, shareText } from '../lib/sharing'
import {
  ShoppingCart, CheckCircle2, Square, Download,
  Info, Sparkles, ArrowRight, Share2, ChevronDown,
  ChevronRight, X, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

export function savePlanToSession(plan) {
  try { sessionStorage.setItem('mealplan_current', JSON.stringify(plan)) } catch {}
}
export function loadPlanFromSession() {
  try { return JSON.parse(sessionStorage.getItem('mealplan_current') || 'null') } catch { return null }
}

const CAT_ICONS = {
  'Produce':             '🥦',
  'Meat & Seafood':      '🥩',
  'Dairy & Eggs':        '🥛',
  'Bread & Bakery':      '🍞',
  'Pantry & Dry Goods':  '🥫',
  'Nuts, Seeds & Oils':  '🥜',
  'Condiments & Sauces': '🫙',
  'Spices & Herbs':      '🌿',
  'Frozen':              '🧊',
  'Beverages':           '☕',
  'Other':               '📦',
}

const CAT_COLORS = {
  'Produce':             '#1F9E62',
  'Meat & Seafood':      '#D4502A',
  'Dairy & Eggs':        '#F59E0B',
  'Bread & Bakery':      '#B45309',
  'Pantry & Dry Goods':  '#6366F1',
  'Nuts, Seeds & Oils':  '#D97706',
  'Condiments & Sauces': '#0891B2',
  'Spices & Herbs':      '#059669',
  'Frozen':              '#3B82F6',
  'Beverages':           '#8B5CF6',
  'Other':               '#6B7280',
}

export default function GroceryPage() {
  const navigate  = useNavigate()
  const { plans, loadPlan: loadSavedPlan } = usePlans()
  const { weeklyPlan, servings, loadPlan: storeLoadPlan } = usePlanStore()

  const [checked,         setChecked]         = useState({})
  const [showMeals,       setShowMeals]       = useState(false)
  const [showQuantities,  setShowQuantities]  = useState(true)
  const [selectedPlanId,  setSelectedPlanId]  = useState('')
  const [collapsedCats,   setCollapsedCats]   = useState({})
  const [sharing,         setSharing]         = useState(false)

  const groceryMap  = useMemo(() => weeklyPlan ? buildGroceryList(weeklyPlan) : {}, [weeklyPlan])
  const grouped     = useMemo(() => groupGroceryByCategory(groceryMap), [groceryMap])
  const allIngreds  = useMemo(() => Object.keys(groceryMap), [groceryMap])
  const checkedCount = allIngreds.filter(i => checked[i]).length
  const progress     = allIngreds.length ? Math.round((checkedCount / allIngreds.length) * 100) : 0

  function toggle(ing)     { setChecked(p => ({ ...p, [ing]: !p[ing] })) }
  function selectAll()     { setChecked(Object.fromEntries(allIngreds.map(i => [i, true]))) }
  function clearAll()      { setChecked({}) }
  function toggleCat(cat)  { setCollapsedCats(p => ({ ...p, [cat]: !p[cat] })) }

  function handleLoadPlan(id) {
    const plan = plans.find(p => p.id === id)
    if (!plan) return
    storeLoadPlan(loadSavedPlan(plan))
    setChecked({})
    setSelectedPlanId(id)
  }

  async function handleShare() {
    setSharing(true)
    const text   = buildGroceryShareText(groceryMap)
    const result = await shareText("🛒 Grocery List", text)
    if (result.clipboard) toast.success('Grocery list copied to clipboard!')
    else if (result.success) toast.success('Shared!')
    else toast.error('Could not share')
    setSharing(false)
  }

  function exportTxt() {
    const lines = ['# Grocery List', `${new Date().toLocaleDateString()}`, '']
    for (const cat of GROCERY_CATEGORY_ORDER) {
      const items = grouped[cat]
      if (!items || !Object.keys(items).length) continue
      lines.push(`\n── ${cat} ──`)
      Object.keys(items).sort().forEach(ing => {
        const qty = estimateQuantity(ing, (groceryMap[ing] || []).length, servings)
        lines.push(`${checked[ing] ? '[x]' : '[ ]'} ${ing.charAt(0).toUpperCase() + ing.slice(1)}${qty ? `  (${qty})` : ''}`)
      })
    }
    lines.push('\nMade with MealPlan 🥗')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }))
    a.download = 'grocery-list.txt'
    a.click()
  }

  // ── Empty state ──────────────────────────────────────────
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
          No active plan
        </h3>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '24px', maxWidth: '300px' }}>
          Head to the Planner, generate your week, then come back for your full grocery list.
        </p>
        <button onClick={() => navigate('/planner')} className="btn-primary btn btn-lg">
          <Sparkles size={17} /> Go to Planner <ArrowRight size={16} />
        </button>
      </div>
      {plans.length > 0 && (
        <div className="card p-5">
          <p className="font-semibold mb-4" style={{ fontSize: '16px', color: 'var(--text)' }}>Or load a saved plan</p>
          <div className="space-y-2">
            {plans.map(plan => (
              <button key={plan.id} onClick={() => handleLoadPlan(plan.id)}
                className="w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <span className="font-semibold">{plan.name}</span>
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

  // ── Main grocery list ───────────────────────────────────
  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <span className="page-eyebrow">Grocery List</span>
          <h1 className="section-title">What to buy</h1>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <p style={{ color: 'var(--text-3)', fontSize: '15px' }}>
              {checkedCount} of {allIngreds.length} items · {Object.keys(grouped).length} categories
            </p>
            <span className="badge flex items-center gap-1" style={{ background: 'rgba(31,158,98,0.1)', color: 'var(--brand)', border: '1px solid rgba(31,158,98,0.2)', fontSize: '11px' }}>
              👥 {servings} {servings === 1 ? 'person' : 'people'}
            </span>
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button onClick={handleShare} disabled={sharing} className="btn-secondary btn gap-2 tap-target">
            {sharing ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Share2 size={16} />}
            Share list
          </button>
          <button onClick={exportTxt} className="btn-secondary btn gap-2 tap-target">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="card p-5 mb-5" style={{ animation: 'slideUp 0.4s ease 0.05s both' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold" style={{ fontSize: '15px', color: 'var(--text)' }}>
            Shopping progress
          </span>
          <span className="font-mono font-bold" style={{ fontSize: '24px', color: 'var(--brand)', letterSpacing: '-0.04em' }}>
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
      <div className="flex flex-wrap gap-2.5 mb-6" style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
        <button onClick={selectAll} className="btn-secondary btn gap-2">
          <CheckCircle2 size={16} /> Select all
        </button>
        <button onClick={clearAll} className="btn-secondary btn gap-2">
          <Square size={16} /> Clear all
        </button>
        <button onClick={() => setShowQuantities(v => !v)} className="btn gap-2"
          style={{
            background: showQuantities ? 'rgba(31,158,98,0.1)' : 'var(--surface)',
            border: `1.5px solid ${showQuantities ? 'rgba(31,158,98,0.3)' : 'var(--border)'}`,
            color: showQuantities ? 'var(--brand)' : 'var(--text-3)',
          }}>
          🧮 {showQuantities ? 'Hide' : 'Show'} quantities
        </button>
        <button onClick={() => setShowMeals(v => !v)} className="btn gap-2"
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
            <option value="">Switch plan…</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Categorised grocery list */}
      <div className="space-y-3" style={{ animation: 'slideUp 0.4s ease 0.15s both' }}>
        {GROCERY_CATEGORY_ORDER.map(cat => {
          const items = grouped[cat]
          if (!items || !Object.keys(items).length) return null
          const catIngreds    = Object.keys(items).sort()
          const catChecked    = catIngreds.filter(i => checked[i]).length
          const allDone       = catChecked === catIngreds.length
          const isCollapsed   = collapsedCats[cat]
          const accentColor   = CAT_COLORS[cat] || '#6B7280'

          return (
            <div key={cat} className="card overflow-hidden"
              style={{ borderColor: allDone ? 'rgba(31,158,98,0.25)' : 'var(--border)' }}>

              {/* Category header */}
              <button onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-200"
                style={{ background: allDone ? 'rgba(31,158,98,0.04)' : 'transparent' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                  style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                  {CAT_ICONS[cat] || '📦'}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold" style={{ fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.01em' }}>
                    {cat}
                    {allDone && <span className="ml-2 text-xs font-bold" style={{ color: 'var(--brand)' }}>✓ Done</span>}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    {catChecked}/{catIngreds.length} items
                  </p>
                </div>
                {/* Mini progress bar */}
                <div className="w-16 rounded-full overflow-hidden hidden sm:block" style={{ height: '4px', background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(catChecked / catIngreds.length) * 100}%`, background: accentColor }} />
                </div>
                {isCollapsed ? <ChevronRight size={16} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />}
              </button>

              {/* Items */}
              {!isCollapsed && catIngreds.map((ing, idx) => {
                const done    = !!checked[ing]
                const meals   = groceryMap[ing] || []
                const qty     = estimateQuantity(ing, meals.length, servings)

                return (
                  <button key={ing} onClick={() => toggle(ing)}
                    className="w-full flex items-start gap-4 px-5 py-3.5 text-left transition-all duration-150"
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: done ? 'rgba(31,158,98,0.03)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!done) e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = done ? 'rgba(31,158,98,0.03)' : 'transparent' }}>

                    {/* Checkbox */}
                    <div className="shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200"
                      style={{
                        width: '22px', height: '22px', borderRadius: '7px',
                        border: done ? 'none' : '2px solid var(--border)',
                        background: done ? `linear-gradient(135deg,${accentColor},${accentColor}cc)` : 'var(--surface)',
                        boxShadow: done ? `0 2px 10px ${accentColor}40` : 'none',
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
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="font-medium capitalize transition-all duration-200"
                          style={{ fontSize: '15px', color: done ? 'var(--text-3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                          {ing}
                        </p>
                        {showQuantities && qty && (
                          <span className="font-mono shrink-0" style={{ fontSize: '12px', color: done ? 'var(--border)' : accentColor, fontWeight: 600 }}>
                            {qty}
                          </span>
                        )}
                      </div>
                      {showMeals && meals.length > 0 && (
                        <p className="mt-0.5 transition-colors duration-200" style={{ fontSize: '12px', color: done ? 'var(--border)' : 'var(--text-3)' }}>
                          {meals.slice(0, 3).join(' · ')}{meals.length > 3 ? ` +${meals.length - 3}` : ''}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 font-mono font-semibold px-2 py-0.5 rounded-lg"
                      style={{ fontSize: '11px', color: done ? 'var(--border)' : 'var(--text-3)', background: 'var(--surface-2)' }}>
                      ×{meals.length}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
