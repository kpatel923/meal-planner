import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { usePlans } from '../hooks/usePlans'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { usePlanStore } from '../hooks/usePlanStore'
import { DAYS, CATEGORIES, DIET_LABELS } from '../lib/mealLogic'
import { exportToPDF } from '../lib/pdfExport'
import { buildPlanShareText, buildShareableURL, shareText } from '../lib/sharing'
import { generatePlanDescription } from '../lib/aiFeatures'
import { weeklyNutritionTotals, nutritionColor } from '../lib/nutrition'
import {
  Download, Save, ChevronDown, ChevronUp, Loader2, Sparkles,
  AlertCircle, X, ArrowLeftRight, RotateCcw, Play, Camera,
  ExternalLink, RefreshCw, CheckCircle2, Circle, Share2,
  Link, Undo2, Wand2, ChefHat, Users, Printer, Flame
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

function MealFlipCard({ meal, category, isDark, onSwap, isPrepDone, onTogglePrep, dayIdx, onDragStart, onDragOver, onDrop, isDragTarget }) {
  const [flipped, setFlipped] = useState(false)
  const style   = CAT_STYLES[category]
  const diet    = meal ? DIET_LABELS[meal.diet_type] : null
  const videoLink = meal?.video_url ? getLinkMeta(meal.video_url) : null
  const hasWritten = !!meal?.written_url
  const hasAnyLink = videoLink || hasWritten
  const prepped = isPrepDone
  const cardHeight = hasAnyLink ? '212px' : '196px'

  return (
    <div className="flip-card-outer" style={{ height: cardHeight, marginTop: '10px' }}>
      <div className={`flip-card-wrapper ${flipped ? 'flipped' : ''}`}
        style={{ height: cardHeight, outline: isDragTarget ? '2px dashed var(--brand)' : 'none', outlineOffset: '2px', borderRadius: '18px' }}
        draggable={!!meal}
        onDragStart={e => { e.stopPropagation(); onDragStart && onDragStart() }}
        onDragOver={e => { e.preventDefault(); onDragOver && onDragOver() }}
        onDrop={e => { e.preventDefault(); onDrop && onDrop() }}
        onClick={() => meal && setFlipped(f => !f)}>
        <div className="flip-card-inner" style={{ height: cardHeight }}>

          {/* ── FRONT ── */}
          <div className={`flip-card-front rounded-2xl border p-4 flex flex-col ${isDark ? style.dark : style.light}`}
            style={{ height: cardHeight, opacity: prepped ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize:'15px' }}>{style.icon}</span>
                <span className="font-bold uppercase" style={{ fontSize:'10px', color:style.accent, letterSpacing:'0.08em' }}>
                  {category}
                </span>
                {prepped && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white font-bold"
                    style={{ fontSize:'9px', background: style.accent }}>
                    ✓ Done
                  </span>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); onSwap() }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-white transition-all hover:opacity-90 active:scale-95 tap-target"
                style={{ fontSize:'11px', background:style.accent, fontWeight:700, minHeight:'30px' }}>
                <ArrowLeftRight size={10} /> Swap
              </button>
            </div>

            {meal ? (
              <>
                <p className="font-semibold leading-tight flex-1"
                  style={{ fontSize:'15px', color:'var(--text)', letterSpacing:'-0.02em', textDecoration: prepped ? 'line-through' : 'none' }}>
                  {meal.item_name}
                </p>
                <p className="mt-1.5 leading-relaxed" style={{ fontSize:'11px', color:'var(--text-3)', lineHeight:'1.5' }}>
                  {meal.ingredients?.split(',').map(i => i.trim()).slice(0,3).join(', ')}
                  {meal.ingredients?.split(',').length > 3 ? '…' : ''}
                </p>
                <div className="flex items-center justify-between mt-3 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {diet && (
                      <span className="badge" style={{ fontSize:'9px', background:`${style.accent}18`, color:style.accent, border:`1px solid ${style.accent}30` }}>
                        {diet.label}
                      </span>
                    )}
                    {/* Prep toggle */}
                    <button onClick={e => { e.stopPropagation(); onTogglePrep() }}
                      className="flex items-center gap-1 transition-all hover:opacity-80 active:scale-95 tap-target"
                      style={{ fontSize:'10px', color: prepped ? style.accent : 'var(--text-3)', fontWeight:600, minHeight:'24px' }}>
                      {prepped
                        ? <CheckCircle2 size={13} style={{ color:style.accent }} />
                        : <Circle size={13} />}
                      {prepped ? 'Prepped' : 'Mark done'}
                    </button>
                  </div>
                  <span className="flex items-center gap-0.5" style={{ fontSize:'10px', color:'var(--text-3)', opacity:0.7, flexShrink:0 }}>
                    <RotateCcw size={9} /> {hasAnyLink ? 'Recipe →' : 'Details →'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-2" style={{ color:'var(--text-3)', fontSize:'13px' }}>
                <AlertCircle size={14} /> No meal assigned
              </div>
            )}
          </div>

          {/* ── BACK ── */}
          <div className={`flip-card-back rounded-2xl border p-4 flex flex-col ${isDark ? style.dark : style.light}`}
            style={{ height: cardHeight }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold" style={{ fontSize:'13px', color:style.accent, letterSpacing:'-0.01em' }}>
                {meal?.item_name || category}
              </span>
              <button onClick={e => { e.stopPropagation(); setFlipped(false) }}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity tap-target"
                style={{ fontSize:'11px', color:'var(--text-3)', fontWeight:600, minHeight:'24px' }}>
                <RotateCcw size={11} /> Back
              </button>
            </div>
            {meal ? (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="font-semibold mb-1" style={{ fontSize:'10px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                    All Ingredients
                  </p>
                  <p style={{ fontSize:'12px', color:'var(--text)', lineHeight:'1.6' }}>
                    {meal.ingredients?.split(',').map(i => i.trim()).join(', ')}
                  </p>
                </div>
                {hasAnyLink ? (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {videoLink && (
                      <a href={meal.video_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 font-semibold text-white transition-all hover:opacity-90 active:scale-95 tap-target"
                        style={{ fontSize:'12.5px', background:videoLink.color, boxShadow:`0 4px 16px ${videoLink.color}40` }}>
                        {videoLink.icon} {videoLink.label}
                      </a>
                    )}
                    {hasWritten && (
                      <a href={meal.written_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 font-semibold transition-all hover:opacity-80 active:scale-95 tap-target"
                        style={{ fontSize:'12.5px', background:'rgba(0,0,0,0.08)', color:'var(--text)' }}>
                        📖 Read Recipe
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl py-2.5 text-center" style={{ fontSize:'12px', color:'var(--text-3)', background:'rgba(0,0,0,0.06)' }}>
                    No recipe link — add one in Recipes tab
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color:'var(--text-3)', fontSize:'13px' }}>
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
  const { profile, user } = useAuth()
  const { isDark }  = useTheme()
  const navigate    = useNavigate()
  const {
    weeklyPlan, generating, dietTypes, expandedDay, undoStack, planDesc, servings,
    avoidRepeats, prevPlanSnapshot,
    setDietTypes, setExpandedDay, setPlanDesc, setServings, setAvoidRepeats,
    generate, regenerateDay, swapMeal, reorderMeal, undoSwap, clearUndo,
    undoGenerate, clearUndoGenerate,
    clearPlan, togglePrep, isPrepDone, prepProgress,
  } = usePlanStore()
  const { savePlan } = usePlans()

  const [planName,       setPlanName]       = useState('')
  const [saving,         setSaving]         = useState(false)
  const [confirmRegen,   setConfirmRegen]   = useState(false)
  const [swapTarget,     setSwapTarget]     = useState(null)
  const [swapSearch,     setSwapSearch]     = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareType,      setShareType]      = useState('plan') // 'plan' | 'grocery'
  const [loadingDesc,    setLoadingDesc]    = useState(false)
  const [regenDay,       setRegenDay]       = useState(null)  // dayIdx being regenerated
  const [dragSlot,       setDragSlot]       = useState(null)  // { dayIdx, category } currently dragged

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
      const plan = await generate(filteredMeals, user?.id)
      toast.success('Week generated!')
      // Auto-generate AI description
      fetchAIDescription(plan)
    } catch {
      toast.error('Not enough meals — add more recipes first.')
    }
  }

  async function handleRegenerateDay(dayIdx) {
    setRegenDay(dayIdx)
    await new Promise(r => setTimeout(r, 500))
    regenerateDay(dayIdx, filteredMeals)
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
    swapMeal(swapTarget.dayIdx, swapTarget.category, meal)
    toast.success(`Swapped to ${meal.item_name}`, {
      icon: '🔄',
      duration: 5000,
    })
    closeSwap()
  }

  async function handleShare(type) {
    setShareType(type)
    setShowShareModal(true)
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
        <div key={i} className="skeleton rounded-2xl" style={{ height:'64px', animationDelay:`${i*80}ms` }} />
      ))}
    </div>
  )

  return (
    <div className="page-container" style={{ animation:'fadeIn 0.35s ease-out' }}>

      {/* ── Undo Toast (swap or generate, mutually exclusive) ── */}
      {undoStack.length > 0 && (
        <div className="fixed bottom-28 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lifted"
          style={{ background:'var(--surface)', border:'1.5px solid var(--border)', animation:'slideUp 0.3s ease', whiteSpace:'nowrap' }}>
          <span style={{ fontSize:'14px', color:'var(--text)' }}>
            Swapped to <strong>{undoStack[0]?.newMeal?.item_name}</strong>
          </span>
          <button onClick={undoSwap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all hover:opacity-80 tap-target"
            style={{ fontSize:'13px', background:'var(--brand)', color:'#fff' }}>
            <Undo2 size={13} /> Undo
          </button>
          <button onClick={clearUndo} style={{ color:'var(--text-3)' }} className="tap-target">
            <X size={15} />
          </button>
        </div>
      )}
      {undoStack.length === 0 && prevPlanSnapshot && (
        <div className="fixed bottom-28 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lifted"
          style={{ background:'var(--surface)', border:'1.5px solid var(--border)', animation:'slideUp 0.3s ease', whiteSpace:'nowrap' }}>
          <span style={{ fontSize:'14px', color:'var(--text)' }}>
            Week regenerated
          </span>
          <button onClick={undoGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all hover:opacity-80 tap-target"
            style={{ fontSize:'13px', background:'var(--brand)', color:'#fff' }}>
            <Undo2 size={13} /> Undo
          </button>
          <button onClick={clearUndoGenerate} style={{ color:'var(--text-3)' }} className="tap-target">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <span className="page-eyebrow">Weekly Planner</span>
          <h1 className="section-title">
            {weeklyPlan ? 'Your week, planned.' : 'Plan your week'}
          </h1>
          <p className="mt-2" style={{ color:'var(--text-3)', fontSize:'15px' }}>
            {filteredMeals.length} meals available · {allMeals.length} in library
          </p>
        </div>
        {weeklyPlan && (
          <div className="flex gap-2.5 flex-wrap no-print">
            <button onClick={() => handleShare('plan')} className="btn-secondary btn gap-2 tap-target">
              <Share2 size={16} /> Share
            </button>
            <button onClick={() => window.print()} className="btn-secondary btn gap-2 tap-target">
              <Printer size={16} /> Print
            </button>
            <button onClick={() => exportToPDF(weeklyPlan, profile?.username)} className="btn-secondary btn gap-2 tap-target">
              <Download size={16} /> PDF
            </button>
            <button onClick={() => navigate('/grocery')} className="btn-secondary btn gap-2 tap-target">
              🛒 Grocery
            </button>
          </div>
        )}
      </div>

      {/* ── Controls ───────────────────────────────────────── */}
      <div className="card p-5 sm:p-6 mb-6" style={{ animation:'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div>
            <p className="input-label mb-3">Diet filter</p>
            <div className="flex gap-2 flex-wrap">
              {DIET_FILTERS.map(({ key, label, color }) => {
                const active = dietTypes.includes(key)
                return (
                  <button key={key} onClick={() => toggleDiet(key)}
                    className="px-4 py-2.5 rounded-full font-semibold transition-all duration-200 active:scale-95 tap-target"
                    style={{ fontSize:'13.5px', border:`2px solid ${active ? color : 'var(--border)'}`, background:active ? `${color}18` : 'transparent', color:active ? color : 'var(--text-3)' }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* People count stepper */}
          <div>
            <p className="input-label mb-3 flex items-center gap-1.5"><Users size={11} /> Cooking for</p>
            <div className="stepper">
              <button onClick={() => setServings(servings - 1)} disabled={servings <= 1} className="stepper-btn" style={{ opacity: servings <= 1 ? 0.3 : 1 }}>−</button>
              <span className="stepper-value">{servings}</span>
              <button onClick={() => setServings(servings + 1)} disabled={servings >= 20} className="stepper-btn" style={{ opacity: servings >= 20 ? 0.3 : 1 }}>+</button>
            </div>
          </div>

          {/* Avoid repeats toggle */}
          <div>
            <p className="input-label mb-3 flex items-center gap-1.5"><RefreshCw size={11} /> Avoid repeats</p>
            <button onClick={() => setAvoidRepeats(v => !v)}
              className="relative rounded-full transition-all duration-300 tap-target"
              style={{ width:'52px', height:'30px', background: avoidRepeats ? 'var(--brand)' : 'var(--border)' }}>
              <div className="absolute top-1 rounded-full bg-white shadow-md transition-transform duration-300"
                style={{ width:'22px', height:'22px', left:'4px', transform: avoidRepeats ? 'translateX(22px)' : 'translateX(0)' }} />
            </button>
          </div>

          <div className="sm:ml-auto flex gap-2.5 flex-wrap items-center">
            {confirmRegen ? (
              <div className="flex items-center gap-2 flex-wrap" style={{ animation:'slideDown 0.2s ease' }}>
                <span style={{ fontSize:'14px', color:'var(--text-3)' }}>Overwrite current plan?</span>
                <button onClick={handleGenerate} className="btn-primary btn-sm btn">Yes</button>
                <button onClick={() => setConfirmRegen(false)} className="btn-secondary btn-sm btn">No</button>
              </div>
            ) : (
              <button onClick={handleGenerate} disabled={generating || !dietTypes.length}
                className="btn-primary btn tap-target" style={{ minWidth:'168px' }}>
                {generating
                  ? <><Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> Building…</>
                  : <><Sparkles size={16} /> {weeklyPlan ? 'Regenerate Week' : 'Generate Week'}</>}
              </button>
            )}
          </div>
        </div>

        {/* Save row */}
        {weeklyPlan && (
          <div className="flex gap-3 mt-5 pt-5" style={{ borderTop:'1px solid var(--border)', animation:'slideDown 0.3s ease both' }}>
            <input className="input flex-1" placeholder="Name this plan to save…"
              value={planName} onChange={e => setPlanName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
            <button onClick={handleSave} disabled={saving || !planName.trim()} className="btn-primary btn">
              {saving ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Save size={16} />}
              Save
            </button>
            <button onClick={clearPlan} className="btn-ghost btn btn-icon" title="Clear plan"><X size={16} /></button>
          </div>
        )}
      </div>

      {/* ── AI Description ─────────────────────────────────── */}
      {weeklyPlan && (
        <div className="card p-5 mb-6 flex items-start gap-4" style={{ animation:'slideUp 0.4s ease 0.1s both', borderColor:'rgba(31,158,98,0.2)', background:'linear-gradient(135deg,rgba(31,158,98,0.05),rgba(31,158,98,0.02))' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background:'linear-gradient(135deg,#27B872,#0B4529)', boxShadow:'0 4px 14px rgba(31,158,98,0.3)' }}>
            <Wand2 size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold mb-1" style={{ fontSize:'13px', color:'var(--brand)' }}>
              AI Plan Summary
            </p>
            {loadingDesc ? (
              <div className="flex items-center gap-2" style={{ color:'var(--text-3)', fontSize:'14px' }}>
                <Loader2 size={14} className="animate-[spin_1s_linear_infinite]" /> Analyzing your week…
              </div>
            ) : planDesc ? (
              <p style={{ fontSize:'14px', color:'var(--text-2)', lineHeight:'1.6' }}>{planDesc}</p>
            ) : (
              <button onClick={() => fetchAIDescription(weeklyPlan, true)}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
                style={{ fontSize:'13px', color:'var(--brand)', fontWeight:600 }}>
                <Sparkles size={13} /> Generate summary
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Weekly Nutrition Summary ──────────────────────────── */}
      {weeklyPlan && (() => {
        const { perDay, totals, mealCount } = weeklyNutritionTotals(weeklyPlan, servings)
        if (!mealCount || !perDay?.calories) return null
        return (
          <div className="card p-5 mb-6" style={{ animation:'slideUp 0.4s ease 0.13s both' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold flex items-center gap-2" style={{ fontSize:'14px', color:'var(--text)' }}>
                <Flame size={15} style={{ color: nutritionColor(perDay.calories) }} /> Weekly Nutrition (avg/day)
              </p>
              <span style={{ fontSize:'11px', color:'var(--text-3)' }}>Estimated</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label:'Calories', val: perDay.calories,  unit:'',  icon:'🔥' },
                { label:'Protein',  val: perDay.protein_g,  unit:'g', icon:'🥩' },
                { label:'Carbs',    val: perDay.carbs_g,    unit:'g', icon:'🍞' },
                { label:'Fat',      val: perDay.fat_g,      unit:'g', icon:'🥑' },
                { label:'Fiber',    val: perDay.fiber_g,    unit:'g', icon:'🌾' },
              ].map(({ label, val, unit, icon }) => (
                <div key={label} className="text-center p-3 rounded-2xl" style={{ background:'var(--surface-2)', border:'1px solid var(--border)' }}>
                  <p style={{ fontSize:'18px', marginBottom:'2px' }}>{icon}</p>
                  <p className="font-display font-bold" style={{ fontSize:'17px', color:'var(--text)', letterSpacing:'-0.02em' }}>
                    {val}{unit}
                  </p>
                  <p style={{ fontSize:'10px', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Empty State ─────────────────────────────────────── */}
      {!weeklyPlan && (
        <div className="flex flex-col items-center justify-center py-28 text-center" style={{ animation:'fadeIn 0.6s ease both' }}>
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-7"
            style={{ background:'linear-gradient(145deg,rgba(31,158,98,0.13),rgba(31,158,98,0.04))', border:'1.5px solid rgba(31,158,98,0.18)', animation:'float 3s ease-in-out infinite', fontSize:'56px' }}>
            🗓
          </div>
          <h3 className="font-display font-semibold mb-3" style={{ fontSize:'26px', color:'var(--text)', letterSpacing:'-0.04em' }}>
            No plan yet
          </h3>
          <p style={{ color:'var(--text-3)', fontSize:'15px', maxWidth:'360px', lineHeight:'1.7' }}>
            Hit <strong style={{ color:'var(--text)' }}>Generate Week</strong> to build a smart 7-day plan. Click any meal card to flip it and see the recipe link.
          </p>
          <div className="flex gap-4 mt-12">
            {['Mon','Tue','Wed'].map((d,i) => (
              <div key={d} className="card px-5 py-4 text-center" style={{ minWidth:'100px', opacity:0.35, animation:`slideUp 0.5s ease ${i*0.08}s both` }}>
                <p style={{ fontSize:'11px', color:'var(--text-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{d}</p>
                <div className="mt-3 space-y-2">
                  {['🍳','🥗','🍝','🍎'].map(e => <div key={e} className="skeleton h-5 rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats + Prep Progress ──────────────────────────── */}
      {weeklyPlan && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7" style={{ animation:'slideUp 0.4s ease 0.1s both' }}>
          {[
            { label:'Days planned', val:'7',               icon:'📅' },
            { label:'Total meals',  val:stats.count,       icon:'🍽' },
            { label:'Ingredients',  val:stats.ingredients, icon:'🛒' },
            { label:'Prepped',      val:`${prepProgress.done}/${prepProgress.total}`, icon:'✅' },
          ].map(({ label, val, icon }) => (
            <div key={label} className="card p-4 text-center hover:scale-[1.02] transition-transform" style={{ cursor:'default' }}>
              <span style={{ fontSize:'24px' }}>{icon}</span>
              <p className="font-display font-bold mt-1.5" style={{ fontSize:'28px', color:'var(--text)', letterSpacing:'-0.05em', lineHeight:1 }}>{val}</p>
              <p style={{ fontSize:'12px', color:'var(--text-3)', marginTop:'4px' }}>{label}</p>
              {label === 'Prepped' && prepProgress.total > 0 && (
                <div className="mt-2 rounded-full overflow-hidden" style={{ height:'3px', background:'var(--surface-2)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width:`${prepProgress.pct}%`, background:'linear-gradient(90deg,#1F9E62,#3AB87D)' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Day Accordion ──────────────────────────────────── */}
      {weeklyPlan && (
        <div className="space-y-3">
          {DAYS.map((dayName, dayIdx) => {
            const dayMeals = weeklyPlan[dayIdx] || {}
            const isOpen   = expandedDay === dayIdx
            const dayPrepped = CATEGORIES.filter(cat => dayMeals[cat]).every(cat => isPrepDone(dayIdx, cat))

            return (
              <div key={dayName} className="card overflow-hidden"
                style={{ animation:`slideUp 0.45s cubic-bezier(0.16,1,0.3,1) ${dayIdx*45}ms both`, borderColor: dayPrepped ? 'rgba(31,158,98,0.3)' : 'var(--border)' }}>

                {/* Day header */}
                <button onClick={() => setExpandedDay(isOpen ? null : dayIdx)}
                  className="w-full flex items-center justify-between px-5 sm:px-6 py-4 transition-all duration-200"
                  style={{ background: isOpen ? 'rgba(31,158,98,0.05)' : dayPrepped ? 'rgba(31,158,98,0.03)' : 'transparent' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold shrink-0"
                      style={{
                        background: dayPrepped ? 'linear-gradient(145deg,#27B872,#167D4D)' : isOpen ? 'linear-gradient(145deg,#27B872,#167D4D)' : 'var(--surface-2)',
                        color: (isOpen || dayPrepped) ? '#fff' : 'var(--text-3)',
                        fontSize:'12px', letterSpacing:'0.04em',
                        transition:'all 0.25s ease',
                        boxShadow: isOpen ? '0 4px 14px rgba(31,158,98,0.35)' : 'none',
                      }}>
                      {dayPrepped ? '✓' : dayName.slice(0,3).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold" style={{ fontSize:'19px', color:'var(--text)', letterSpacing:'-0.03em' }}>
                        {dayName}
                      </span>
                      {!isOpen && (
                        <div className="hidden sm:flex gap-1.5">
                          {CATEGORIES.map(cat => dayMeals[cat]
                            ? <span key={cat} title={dayMeals[cat].item_name} style={{ fontSize:'15px', opacity: isPrepDone(dayIdx, cat) ? 0.4 : 1 }}>{CAT_STYLES[cat].icon}</span>
                            : null
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Regenerate this day */}
                    <button onClick={e => { e.stopPropagation(); handleRegenerateDay(dayIdx) }}
                      disabled={regenDay === dayIdx}
                      title="Regenerate this day"
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-[var(--surface-2)]"
                      style={{ color:'var(--text-3)' }}>
                      {regenDay === dayIdx
                        ? <Loader2 size={14} className="animate-[spin_1s_linear_infinite]" />
                        : <RefreshCw size={14} />}
                    </button>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                      style={{ background:isOpen ? 'rgba(31,158,98,0.13)' : 'var(--surface-2)', color:isOpen ? 'var(--brand)' : 'var(--text-3)' }}>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                </button>

                {/* Expanded flip cards */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1"
                    style={{ borderTop:'1px solid var(--border)', animation:'slideDown 0.28s ease both' }}>
                    <p className="mt-3 mb-1 flex items-center gap-1.5"
                      style={{ fontSize:'11px', color:'var(--text-3)', fontWeight:600 }}>
                      <RotateCcw size={11} />
                      Click a card to flip · drag a card to move it to a different slot
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {CATEGORIES.map(category => (
                        <MealFlipCard key={category}
                          meal={dayMeals[category]}
                          category={category}
                          isDark={isDark}
                          onSwap={() => openSwap(dayIdx, category)}
                          isPrepDone={isPrepDone(dayIdx, category)}
                          onTogglePrep={() => togglePrep(dayIdx, category)}
                          dayIdx={dayIdx}
                          onDragStart={() => setDragSlot({ dayIdx, category })}
                          onDragOver={() => {}}
                          isDragTarget={dragSlot && (dragSlot.dayIdx !== dayIdx || dragSlot.category !== category)}
                          onDrop={() => {
                            if (dragSlot && (dragSlot.dayIdx !== dayIdx || dragSlot.category !== category)) {
                              reorderMeal(dragSlot.dayIdx, dragSlot.category, dayIdx, category)
                              toast.success('Meals swapped!', { icon: '🔀' })
                            }
                            setDragSlot(null)
                          }}
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

      {/* ── Swap Modal ──────────────────────────────────────── */}
      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(12px)', animation:'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && closeSwap()}>
          <div className="w-full max-w-md card flex flex-col" style={{ maxHeight:'82vh', animation:'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom:'1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize:'12px', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>
                  {DAYS[swapTarget.dayIdx]} · {swapTarget.category}
                </p>
                <h3 className="font-display font-semibold mt-0.5" style={{ fontSize:'21px', color:'var(--text)', letterSpacing:'-0.03em' }}>
                  {CAT_STYLES[swapTarget.category]?.icon} Swap meal
                </h3>
              </div>
              <button onClick={closeSwap} className="btn-ghost btn-icon"><X size={19} /></button>
            </div>
            <div className="px-5 py-3.5" style={{ borderBottom:'1px solid var(--border)' }}>
              <input className="input" placeholder={`Search ${swapTarget.category} meals…`}
                value={swapSearch} onChange={e => setSwapSearch(e.target.value)} autoFocus />
            </div>
            <div className="overflow-y-auto flex-1">
              {swapMeals.length === 0 ? (
                <div className="py-10 text-center" style={{ color:'var(--text-3)', fontSize:'14px' }}>No meals found</div>
              ) : swapMeals.map(meal => {
                const isCurrent = weeklyPlan[swapTarget.dayIdx]?.[swapTarget.category]?.id === meal.id
                return (
                  <button key={meal.id} onClick={() => handleSwapSelect(meal)}
                    className="w-full flex items-start gap-4 px-6 py-4 text-left transition-all hover:bg-[var(--surface-2)] group"
                    style={{ borderBottom:'1px solid var(--border)', background:isCurrent ? 'rgba(31,158,98,0.05)' : 'transparent' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background:'var(--surface-2)', border:'1.5px solid var(--border)' }}>
                      {CAT_STYLES[meal.category]?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate" style={{ fontSize:'15px', color:'var(--text)' }}>{meal.item_name}</p>
                        {isCurrent && <span className="badge" style={{ fontSize:'9px', background:'rgba(31,158,98,0.12)', color:'var(--brand)', border:'1px solid rgba(31,158,98,0.2)' }}>Current</span>}
                      </div>
                      <p className="truncate mt-0.5" style={{ fontSize:'12px', color:'var(--text-3)' }}>
                        {meal.ingredients?.split(',').slice(0,3).map(i => i.trim()).join(' · ')}
                      </p>
                    </div>
                    <ArrowLeftRight size={16} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color:'var(--brand)' }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Share Modal ─────────────────────────────────────── */}
      {showShareModal && weeklyPlan && (
        <ShareModal
          weeklyPlan={weeklyPlan}
          username={profile?.username}
          onClose={() => setShowShareModal(false)}
          initialTab={shareType}
        />
      )}
    </div>
  )
}

// ── Share Modal Component ─────────────────────────────────────────────
import { buildGroceryShareText } from '../lib/sharing'
import { buildGroceryList } from '../lib/mealLogic'

function ShareModal({ weeklyPlan, username, onClose, initialTab }) {
  const [tab,      setTab]      = useState(initialTab || 'plan')
  const [copied,   setCopied]   = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const groceryMap  = buildGroceryList(weeklyPlan)
  const planText    = buildPlanShareText(weeklyPlan, username)
  const groceryText = buildGroceryShareText(groceryMap, username)
  const shareableURL = buildShareableURL(weeklyPlan)

  async function handleShare() {
    const text  = tab === 'plan' ? planText : groceryText
    const title = tab === 'plan' ? `${username}'s Meal Plan` : `${username}'s Grocery List`
    const result = await shareText(title, text)
    if (result.clipboard) {
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 3000)
    } else if (result.success) {
      toast.success('Shared!')
    }
  }

  async function copyLink() {
    if (!shareableURL) return
    try {
      await navigator.clipboard.writeText(shareableURL)
      setLinkCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setLinkCopied(false), 3000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  const activeText = tab === 'plan' ? planText : groceryText

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(12px)', animation:'fadeIn 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg card" style={{ animation:'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)', maxHeight:'85vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <h3 className="font-display font-semibold" style={{ fontSize:'21px', color:'var(--text)', letterSpacing:'-0.03em' }}>
              Share
            </h3>
            <p style={{ fontSize:'13px', color:'var(--text-3)', marginTop:'2px' }}>Share your plan or grocery list</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={19} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 pb-0">
          {[
            { key:'plan',    label:'📅 Meal Plan' },
            { key:'grocery', label:'🛒 Grocery List' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2.5 rounded-xl font-semibold transition-all"
              style={{
                fontSize:'13px',
                background: tab === key ? 'var(--brand)' : 'var(--surface-2)',
                color: tab === key ? '#fff' : 'var(--text-3)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-2xl p-4 font-mono"
            style={{ fontSize:'12px', background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text-2)', lineHeight:'1.8', whiteSpace:'pre-wrap', maxHeight:'280px', overflowY:'auto' }}>
            {activeText}
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 space-y-3" style={{ borderTop:'1px solid var(--border)' }}>
          <button onClick={handleShare} className="btn-primary btn w-full btn-lg gap-2">
            <Share2 size={17} />
            {typeof navigator !== 'undefined' && navigator.share ? 'Share…' : copied ? '✓ Copied!' : 'Copy to clipboard'}
          </button>

          {tab === 'plan' && shareableURL && (
            <button onClick={copyLink}
              className="btn-secondary btn w-full gap-2">
              <Link size={16} />
              {linkCopied ? '✓ Link copied!' : 'Copy shareable link'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
