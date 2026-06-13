import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { usePlans } from '../hooks/usePlans'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { usePlanStore } from '../hooks/usePlanStore'
import { DAYS, CATEGORIES, DIET_LABELS } from '../lib/mealLogic'
import { exportToPDF } from '../lib/pdfExport'
import {
  Download, Save, ChevronDown, ChevronUp,
  Loader2, Sparkles, AlertCircle, X, ArrowLeftRight,
  ExternalLink, RotateCcw, Play, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'

const CAT_STYLES = {
  Breakfast: { light:'cat-breakfast', dark:'cat-breakfast-dark', accent:'#F59E0B', icon:'🍳' },
  Lunch:     { light:'cat-lunch',     dark:'cat-lunch-dark',     accent:'#1F9E62', icon:'🥗' },
  Dinner:    { light:'cat-dinner',    dark:'cat-dinner-dark',    accent:'#6366F1', icon:'🍝' },
  Snack:     { light:'cat-snack',     dark:'cat-snack-dark',     accent:'#F43F5E', icon:'🍎' },
}

const DIET_FILTERS = [
  { key:'veg',    label:'Veg',     color:'#1F9E62' },
  { key:'vegan',  label:'Vegan',   color:'#0B9E5E' },
  { key:'nonveg', label:'Non-Veg', color:'#D4502A' },
]

function getLinkMeta(url) {
  if (!url) return null
  if (url.includes('youtube') || url.includes('youtu.be')) return { icon: <Play size={13} />, label: 'Watch on YouTube', color: '#FF0000' }
  if (url.includes('instagram')) return { icon: <Camera size={13} />, label: 'View on Instagram', color: '#E1306C' }
  return { icon: <ExternalLink size={13} />, label: 'View Recipe', color: 'var(--brand)' }
}

// Individual flip card for one meal
function MealFlipCard({ meal, category, isDark, onSwap }) {
  const [flipped, setFlipped] = useState(false)
  const style = CAT_STYLES[category]
  const diet  = meal ? DIET_LABELS[meal.diet_type] : null
  const link  = meal?.notes && (meal.notes.startsWith('http') || meal.notes.startsWith('www'))
    ? getLinkMeta(meal.notes) : null
  const cardHeight = '190px'

  return (
    <div className="flip-card-outer" style={{ height: cardHeight, marginTop: '10px' }}>
      <div
        className={`flip-card-wrapper ${flipped ? 'flipped' : ''}`}
        style={{ height: cardHeight }}
        onClick={() => meal && setFlipped(f => !f)}
      >
        <div className="flip-card-inner" style={{ height: cardHeight }}>

          {/* ── FRONT ── */}
          <div
            className={`flip-card-front rounded-2xl border p-4 flex flex-col ${isDark ? style.dark : style.light}`}
            style={{ height: cardHeight }}
          >
            {/* Top row: category label + swap */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '15px' }}>{style.icon}</span>
                <span className="font-bold uppercase" style={{ fontSize: '10px', color: style.accent, letterSpacing: '0.08em' }}>
                  {category}
                </span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onSwap() }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-white transition-all duration-150 hover:opacity-90 active:scale-95"
                style={{ fontSize: '11px', background: style.accent, fontWeight: 700 }}
              >
                <ArrowLeftRight size={10} /> Swap
              </button>
            </div>

            {meal ? (
              <>
                <p className="font-semibold leading-tight flex-1" style={{ fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {meal.item_name}
                </p>
                <p className="mt-1.5 leading-relaxed" style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: '1.5' }}>
                  {meal.ingredients?.split(',').map(i => i.trim()).slice(0, 3).join(', ')}
                  {meal.ingredients?.split(',').length > 3 ? '…' : ''}
                </p>
                <div className="flex items-center justify-between mt-3">
                  {diet && (
                    <span className="badge" style={{ fontSize: '9px', background: `${style.accent}18`, color: style.accent, border: `1px solid ${style.accent}30` }}>
                      {diet.label}
                    </span>
                  )}
                  {/* Flip hint */}
                  <span className="flex items-center gap-1 ml-auto" style={{ fontSize: '10px', color: 'var(--text-3)', opacity: 0.7 }}>
                    <RotateCcw size={9} /> {link ? 'Flip for recipe' : 'Flip for details'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-2" style={{ color: 'var(--text-3)', fontSize: '13px' }}>
                <AlertCircle size={14} /> No meal assigned
              </div>
            )}
          </div>

          {/* ── BACK ── */}
          <div
            className={`flip-card-back rounded-2xl border p-4 flex flex-col ${isDark ? style.dark : style.light}`}
            style={{ height: cardHeight }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold" style={{ fontSize: '13px', color: style.accent, letterSpacing: '-0.01em' }}>
                {meal?.item_name || category}
              </span>
              <button
                onClick={e => { e.stopPropagation(); setFlipped(false) }}
                className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}
              >
                <RotateCcw size={11} /> Back
              </button>
            </div>

            {meal ? (
              <>
                {/* All ingredients */}
                <div className="flex-1">
                  <p className="font-semibold mb-1" style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Ingredients
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: '1.6' }}>
                    {meal.ingredients?.split(',').map(i => i.trim()).join(', ')}
                  </p>
                </div>

                {/* Recipe link */}
                {link ? (
                  <a
                    href={meal.notes}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl py-2.5 font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ fontSize: '13px', background: link.color, boxShadow: `0 4px 16px ${link.color}40` }}
                  >
                    {link.icon}
                    {link.label}
                  </a>
                ) : (
                  <div className="mt-3 rounded-xl py-2.5 text-center" style={{ fontSize: '12px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.06)' }}>
                    No recipe link saved
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)', fontSize: '13px' }}>
                No meal assigned
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlannerPage() {
  const { profile } = useAuth()
  const { isDark }  = useTheme()
  const navigate    = useNavigate()
  const {
    weeklyPlan, generating, dietTypes, expandedDay,
    setDietTypes, setExpandedDay, generate, swapMeal, clearPlan,
  } = usePlanStore()
  const { savePlan } = usePlans()

  const [planName,     setPlanName]     = useState('')
  const [saving,       setSaving]       = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [swapTarget,   setSwapTarget]   = useState(null)
  const [swapSearch,   setSwapSearch]   = useState('')

  const { meals: allMeals,      loading: mealsLoading } = useMeals()
  const { meals: filteredMeals }                        = useMeals({ diet_types: dietTypes })

  function toggleDiet(key) {
    setDietTypes(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key])
  }

  async function handleGenerate() {
    if (!dietTypes.length) { toast.error('Select at least one diet type'); return }
    if (weeklyPlan && !confirmRegen) { setConfirmRegen(true); return }
    setConfirmRegen(false)
    try {
      await generate(filteredMeals)
      toast.success('Week generated!')
    } catch {
      toast.error('Not enough meals. Add more recipes first.')
    }
  }

  async function handleSave() {
    if (!weeklyPlan) return
    if (!planName.trim()) { toast.error('Give this plan a name first'); return }
    setSaving(true)
    await savePlan(planName.trim(), weeklyPlan)
    setPlanName('')
    setSaving(false)
  }

  function openSwap(dayIdx, category) { setSwapTarget({ dayIdx, category }); setSwapSearch('') }
  function closeSwap() { setSwapTarget(null); setSwapSearch('') }

  function handleSwapSelect(meal) {
    if (!swapTarget) return
    swapMeal(swapTarget.dayIdx, swapTarget.category, meal)
    toast.success(`Swapped to ${meal.item_name}`)
    closeSwap()
  }

  const swapMeals = swapTarget
    ? allMeals.filter(m =>
        m.category === swapTarget.category &&
        m.item_name.toLowerCase().includes(swapSearch.toLowerCase())
      )
    : []

  const stats = weeklyPlan ? (() => {
    const ings = new Set()
    let count  = 0
    Object.values(weeklyPlan).forEach(day => Object.values(day).forEach(meal => {
      count++
      meal.ingredients?.split(',').forEach(i => ings.add(i.trim().toLowerCase()))
    }))
    return { count, ingredients: ings.size }
  })() : null

  if (mealsLoading) return (
    <div className="page-container space-y-4 mt-8">
      {[...Array(5)].map((_,i) => (
        <div key={i} className="skeleton rounded-2xl" style={{ height: '64px', animationDelay: `${i*80}ms` }} />
      ))}
    </div>
  )

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease-out' }}>

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <span className="page-eyebrow">Weekly Planner</span>
          <h1 className="section-title">
            {weeklyPlan ? 'Your week, planned.' : 'Plan your week'}
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-3)', fontSize: '15px' }}>
            {filteredMeals.length} meals available · {allMeals.length} in library
          </p>
        </div>
        {weeklyPlan && (
          <div className="flex gap-2.5 flex-wrap">
            <button onClick={() => exportToPDF(weeklyPlan, profile?.username)} className="btn-secondary btn">
              <Download size={16} /> PDF
            </button>
            <button onClick={() => navigate('/grocery')} className="btn-secondary btn">
              🛒 Grocery List
            </button>
          </div>
        )}
      </div>

      {/* ── Controls card ─────────────────────────────── */}
      <div className="card p-5 sm:p-6 mb-6" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div>
            <p className="input-label mb-3">Diet filter</p>
            <div className="flex gap-2 flex-wrap">
              {DIET_FILTERS.map(({ key, label, color }) => {
                const active = dietTypes.includes(key)
                return (
                  <button key={key} onClick={() => toggleDiet(key)}
                    className="px-4 py-2 rounded-full font-semibold transition-all duration-200 active:scale-95"
                    style={{
                      fontSize: '13px',
                      border: `2px solid ${active ? color : 'var(--border)'}`,
                      background: active ? `${color}18` : 'transparent',
                      color: active ? color : 'var(--text-3)',
                    }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sm:ml-auto flex gap-2.5 flex-wrap items-center">
            {confirmRegen ? (
              <div className="flex items-center gap-2 animate-[slideInRight_0.2s_ease]">
                <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>Overwrite plan?</span>
                <button onClick={handleGenerate} className="btn-primary btn-sm btn">Yes, regenerate</button>
                <button onClick={() => setConfirmRegen(false)} className="btn-secondary btn-sm btn">Keep it</button>
              </div>
            ) : (
              <button onClick={handleGenerate} disabled={generating || !dietTypes.length}
                className="btn-primary btn" style={{ minWidth: '168px' }}>
                {generating
                  ? <><Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> Building…</>
                  : <><Sparkles size={16} /> {weeklyPlan ? 'Regenerate' : 'Generate Week'}</>}
              </button>
            )}
          </div>
        </div>

        {weeklyPlan && (
          <div className="flex gap-3 mt-5 pt-5" style={{ borderTop: '1px solid var(--border)', animation: 'slideDown 0.3s ease both' }}>
            <input className="input flex-1" placeholder="Name this plan to save…"
              value={planName} onChange={e => setPlanName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
            <button onClick={handleSave} disabled={saving || !planName.trim()} className="btn-primary btn">
              {saving ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Save size={16} />}
              Save
            </button>
            <button onClick={clearPlan} className="btn-ghost btn btn-icon" title="Clear plan">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────── */}
      {!weeklyPlan && (
        <div className="flex flex-col items-center justify-center py-28 text-center" style={{ animation: 'fadeIn 0.6s ease both' }}>
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-7"
            style={{
              background: 'linear-gradient(145deg,rgba(31,158,98,0.13),rgba(31,158,98,0.04))',
              border: '1.5px solid rgba(31,158,98,0.18)',
              animation: 'float 3s ease-in-out infinite',
              fontSize: '56px',
            }}>
            🗓
          </div>
          <h3 className="font-display font-semibold mb-3" style={{ fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.04em' }}>
            No plan yet
          </h3>
          <p style={{ color: 'var(--text-3)', fontSize: '15px', maxWidth: '360px', lineHeight: '1.7' }}>
            Hit <strong style={{ color: 'var(--text)' }}>Generate Week</strong> to build a smart 7-day plan optimised around your grocery list. Flip any meal card to see its recipe link.
          </p>

          {/* Ghost preview cards */}
          <div className="flex gap-4 mt-12">
            {['Mon','Tue','Wed'].map((d, i) => (
              <div key={d} className="card px-5 py-4 text-center"
                style={{ minWidth: '100px', opacity: 0.35, animation: `slideUp 0.5s ease ${i * 0.08}s both` }}>
                <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{d}</p>
                <div className="mt-3 space-y-2">
                  {['🍳','🥗','🍝','🍎'].map(e => (
                    <div key={e} className="skeleton h-5 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────── */}
      {weeklyPlan && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7" style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
          {[
            { label: 'Days planned', val: '7',               icon: '📅' },
            { label: 'Total meals',  val: stats.count,       icon: '🍽' },
            { label: 'Ingredients',  val: stats.ingredients, icon: '🛒' },
            { label: 'Diet types',   val: dietTypes.length,  icon: '🥦' },
          ].map(({ label, val, icon }) => (
            <div key={label} className="card p-4 text-center transition-transform hover:scale-[1.03]"
              style={{ cursor: 'default' }}>
              <span style={{ fontSize: '24px' }}>{icon}</span>
              <p className="font-display font-bold mt-1.5" style={{ fontSize: '30px', color: 'var(--text)', letterSpacing: '-0.05em', lineHeight: 1 }}>{val}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Day accordion ──────────────────────────────── */}
      {weeklyPlan && (
        <div className="space-y-3">
          {DAYS.map((dayName, dayIdx) => {
            const dayMeals = weeklyPlan[dayIdx] || {}
            const isOpen   = expandedDay === dayIdx

            return (
              <div key={dayName} className="card overflow-hidden"
                style={{ animation: `slideUp 0.45s cubic-bezier(0.16,1,0.3,1) ${dayIdx * 45}ms both` }}>

                {/* Day header */}
                <button
                  onClick={() => setExpandedDay(isOpen ? null : dayIdx)}
                  className="w-full flex items-center justify-between px-5 sm:px-6 py-4 transition-all duration-200"
                  style={{ background: isOpen ? 'rgba(31,158,98,0.05)' : 'transparent' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold shrink-0"
                      style={{
                        background: isOpen ? 'linear-gradient(145deg,#27B872,#167D4D)' : 'var(--surface-2)',
                        color: isOpen ? '#fff' : 'var(--text-3)',
                        fontSize: '12px',
                        letterSpacing: '0.04em',
                        transition: 'all 0.25s ease',
                        boxShadow: isOpen ? '0 4px 14px rgba(31,158,98,0.35)' : 'none',
                      }}>
                      {dayName.slice(0,3).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold" style={{ fontSize: '19px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
                        {dayName}
                      </span>
                      {/* Meal emoji previews when collapsed */}
                      {!isOpen && (
                        <div className="hidden sm:flex gap-1.5">
                          {CATEGORIES.map(cat => dayMeals[cat]
                            ? <span key={cat} title={dayMeals[cat].item_name} style={{ fontSize: '15px' }}>{CAT_STYLES[cat].icon}</span>
                            : null
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isOpen && (
                      <span className="hidden md:block truncate max-w-[220px]" style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                        {Object.values(dayMeals).map(m => m?.item_name).filter(Boolean).slice(0,2).join(' · ')}
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
                      style={{ background: isOpen ? 'rgba(31,158,98,0.13)' : 'var(--surface-2)', color: isOpen ? 'var(--brand)' : 'var(--text-3)' }}>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                </button>

                {/* Expanded: flip cards */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1"
                    style={{ borderTop: '1px solid var(--border)', animation: 'slideDown 0.28s ease both' }}>

                    {/* Flip hint */}
                    <p className="mt-3 mb-1 flex items-center gap-1.5"
                      style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
                      <RotateCcw size={11} />
                      Click any card to flip and see ingredients or recipe link
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {CATEGORIES.map(category => (
                        <MealFlipCard
                          key={category}
                          meal={dayMeals[category]}
                          category={category}
                          isDark={isDark}
                          onSwap={() => openSwap(dayIdx, category)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Swap modal ─────────────────────────────────── */}
      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && closeSwap()}>
          <div className="w-full max-w-md card flex flex-col"
            style={{ maxHeight: '82vh', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {DAYS[swapTarget.dayIdx]} · {swapTarget.category}
                </p>
                <h3 className="font-display font-semibold mt-0.5" style={{ fontSize: '21px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  {CAT_STYLES[swapTarget.category]?.icon} Swap meal
                </h3>
              </div>
              <button onClick={closeSwap} className="btn-ghost btn-icon"><X size={19} /></button>
            </div>

            {/* Search */}
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <input className="input" placeholder={`Search ${swapTarget.category} meals…`}
                value={swapSearch} onChange={e => setSwapSearch(e.target.value)} autoFocus />
            </div>

            {/* Meal list */}
            <div className="overflow-y-auto flex-1">
              {swapMeals.length === 0 ? (
                <div className="py-10 text-center" style={{ color: 'var(--text-3)', fontSize: '14px' }}>No meals found</div>
              ) : swapMeals.map(meal => {
                const isCurrent = weeklyPlan[swapTarget.dayIdx]?.[swapTarget.category]?.id === meal.id
                return (
                  <button key={meal.id} onClick={() => handleSwapSelect(meal)}
                    className="w-full flex items-start gap-4 px-6 py-4 text-left transition-all hover:bg-[var(--surface-2)] group"
                    style={{ borderBottom: '1px solid var(--border)', background: isCurrent ? 'rgba(31,158,98,0.05)' : 'transparent' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                      style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                      {CAT_STYLES[meal.category]?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate" style={{ fontSize: '15px', color: 'var(--text)' }}>{meal.item_name}</p>
                        {isCurrent && (
                          <span className="badge" style={{ fontSize: '9px', background: 'rgba(31,158,98,0.12)', color: 'var(--brand)', border: '1px solid rgba(31,158,98,0.2)' }}>
                            Current
                          </span>
                        )}
                      </div>
                      <p className="truncate mt-0.5" style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        {meal.ingredients?.split(',').slice(0,3).map(i => i.trim()).join(' · ')}
                      </p>
                    </div>
                    <ArrowLeftRight size={16} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--brand)' }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
