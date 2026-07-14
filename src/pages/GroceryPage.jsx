import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '../hooks/usePlans'
import { usePlanStore } from '../hooks/usePlanStore'
import { useAuth } from '../hooks/useAuth'
import { buildGroceryList } from '../lib/mealLogic'
import { groupGroceryByCategory, GROCERY_CATEGORY_ORDER, estimateQuantity } from '../lib/groceryCategories'
import { buildGroceryShareText, shareText } from '../lib/sharing'
import { saveForOffline, loadOfflineData, saveOfflineChecked, isOnline } from '../lib/offline'
import { tapHaptic } from '../lib/haptics'
import { syncActivePlan, fetchActivePlan } from '../lib/planSync'
import PageHeader from '../components/planner/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import {
  ShoppingCart, CheckCircle2, Square,
  Info, Sparkles, ArrowRight, Share2, ChevronDown,
  ChevronRight, Loader2, WifiOff, Wifi, Check, Plus, X, RotateCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'

export function savePlanToSession(plan) {
  try { sessionStorage.setItem('mealplan_current', JSON.stringify(plan)) } catch {}
}
export function loadPlanFromSession() {
  try { return JSON.parse(sessionStorage.getItem('mealplan_current') || 'null') } catch { return null }
}

const CAT_ICONS = {
  'Produce':'🥦','Meat & Seafood':'🥩','Dairy & Eggs':'🥛','Bread & Bakery':'🍞',
  'Pantry & Dry Goods':'🥫','Nuts, Seeds & Oils':'🥜','Condiments & Sauces':'🫙',
  'Spices & Herbs':'🌿','Frozen':'🧊','Beverages':'☕','Other':'📦',
}
const CAT_COLORS = {
  'Produce':'var(--brand)','Meat & Seafood':'var(--danger)','Dairy & Eggs':'#F59E0B',
  'Bread & Bakery':'#B45309','Pantry & Dry Goods':'#8B5FBF','Nuts, Seeds & Oils':'#D97706',
  'Condiments & Sauces':'#0891B2','Spices & Herbs':'#059669','Frozen':'#3B82F6',
  'Beverages':'#8B5CF6','Other':'#6B7280',
}

export default function GroceryPage() {
  const navigate  = useNavigate()
  const { plans, loadPlan: loadSavedPlan } = usePlans()
  const { profile } = useAuth()
  const { weeklyPlan, servings, loadPlan: storeLoadPlan } = usePlanStore()
  const pantrySet = useMemo(
    () => new Set((profile?.pantry_items || []).map(s => s.toLowerCase())),
    [profile?.pantry_items],
  )

  const [checked,         setChecked]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('mealplan_grocery_checked') || '{}') } catch { return {} }
  })
  const [showMeals,       setShowMeals]       = useState(false)
  const [showQuantities,  setShowQuantities]  = useState(true)
  const [selectedPlanId,  setSelectedPlanId]  = useState('')
  const [collapsedCats,   setCollapsedCats]   = useState({})
  const [sharing,         setSharing]         = useState(false)
  const [online,          setOnline]          = useState(isOnline())
  const [offlineLoaded,   setOfflineLoaded]   = useState(false)
  const [offlinePlan,     setOfflinePlan]     = useState(null)

  // ── Customizable list: user-added extras + removed (hidden) items ──
  const [extraItems,  setExtraItems]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('mealplan_grocery_extra') || '[]') } catch { return [] }
  })   // [{ name, category }]
  const [removedItems, setRemovedItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mealplan_grocery_removed') || '{}') } catch { return {} }
  }) // { ingredientName: true }
  const [newItemName, setNewItemName] = useState('')

  const effectivePlan = weeklyPlan || offlinePlan
  const usingOfflineCache = !weeklyPlan && !!offlinePlan

  // Reset customizations whenever the underlying plan changes (e.g. regenerate).
  // On load, pull grocery edits from the server so they match across devices.
  // Runs once; server is the source of truth for cross-device consistency.
  const [groceryHydrated, setGroceryHydrated] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const server = await fetchActivePlan()
      if (cancelled || !server?.grocery) { setGroceryHydrated(true); return }
      const g = server.grocery
      if (Array.isArray(g.extra)) setExtraItems(g.extra)
      if (g.removed && typeof g.removed === 'object') setRemovedItems(g.removed)
      if (g.checked && typeof g.checked === 'object') setChecked(g.checked)
      setGroceryHydrated(true)
    }
    hydrate()
    return () => { cancelled = true }
  }, [])

  // Persist manual edits locally AND sync to the server (so grocery edits carry
  // across devices, like the plan does).
  useEffect(() => {
    try {
      localStorage.setItem('mealplan_grocery_extra', JSON.stringify(extraItems))
      localStorage.setItem('mealplan_grocery_removed', JSON.stringify(removedItems))
    } catch {}
    if (groceryHydrated) syncActivePlan({ grocery: { extra: extraItems, removed: removedItems, checked } })
  }, [extraItems, removedItems])

  // Reset the list back to exactly what the current plan's meals call for,
  // discarding manual additions/removals (but keeping the plan itself).
  function resetToPlanDefault() {
    setExtraItems([])
    setRemovedItems({})
    setChecked({})
    try {
      localStorage.removeItem('mealplan_grocery_extra')
      localStorage.removeItem('mealplan_grocery_removed')
      localStorage.removeItem('mealplan_grocery_checked')
    } catch {}
    toast.success('Grocery list reset to your plan')
  }

  const baseGroceryMap = useMemo(() => effectivePlan ? buildGroceryList(effectivePlan) : {}, [effectivePlan])

  // Merge: drop removed items, add user extras (tagged as "Added by you").
  const groceryMap = useMemo(() => {
    const map = {}
    for (const [ing, meals] of Object.entries(baseGroceryMap)) {
      if (removedItems[ing]) continue
      if (pantrySet.has(ing.toLowerCase())) continue  // already have it at home
      map[ing] = meals
    }
    for (const item of extraItems) {
      const key = item.name.toLowerCase()
      if (!removedItems[key]) map[key] = ['Added by you']
    }
    return map
  }, [baseGroceryMap, extraItems, removedItems, pantrySet])

  const grouped      = useMemo(() => groupGroceryByCategory(groceryMap), [groceryMap])
  const allIngreds   = useMemo(() => Object.keys(groceryMap), [groceryMap])
  const checkedCount = allIngreds.filter(i => checked[i]).length
  const progress     = allIngreds.length ? Math.round((checkedCount / allIngreds.length) * 100) : 0

  function addCustomItem() {
    const name = newItemName.trim()
    if (!name) return
    const key = name.toLowerCase()
    if (allIngreds.includes(key)) { toast.error('That item is already on your list'); return }
    setExtraItems(prev => [...prev, { name: key, category: 'Other' }])
    setRemovedItems(prev => { const n = { ...prev }; delete n[key]; return n })
    setNewItemName('')
  }

  function removeItem(ing) {
    setRemovedItems(prev => ({ ...prev, [ing]: true }))
    setExtraItems(prev => prev.filter(it => it.name !== ing))
    setChecked(prev => { const n = { ...prev }; delete n[ing]; return n })
  }

  useEffect(() => {
    function handleOnline()  { setOnline(true) }
    function handleOffline() { setOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (weeklyPlan && Object.keys(groceryMap).length) {
      saveForOffline(weeklyPlan, groceryMap, checked).catch(() => {})
    }
  }, [weeklyPlan, groceryMap])

  useEffect(() => {
    if (weeklyPlan) saveOfflineChecked(checked).catch(() => {})
    try { localStorage.setItem('mealplan_grocery_checked', JSON.stringify(checked)) } catch {}
    if (groceryHydrated) syncActivePlan({ grocery: { extra: extraItems, removed: removedItems, checked } })
  }, [checked])

  useEffect(() => {
    if (!weeklyPlan && !offlineLoaded) {
      loadOfflineData().then(data => {
        if (data?.weeklyPlan) {
          setOfflinePlan(data.weeklyPlan)
          setChecked(data.checkedItems || {})
        }
        setOfflineLoaded(true)
      })
    }
  }, [weeklyPlan, offlineLoaded])

  function toggle(ing)     { tapHaptic(); setChecked(p => ({ ...p, [ing]: !p[ing] })) }
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
    const text   = buildGroceryShareText(groceryMap, undefined, servings)
    const result = await shareText("🛒 Grocery List", text)
    if (result.clipboard) toast.success('Grocery list copied to clipboard!')
    else if (result.success) toast.success('Shared!')
    else toast.error('Could not share')
    setSharing(false)
  }


  // ── Loading (waiting on offline cache check) ──────────────
  if (!effectivePlan && !offlineLoaded && !weeklyPlan) return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease' }}>
      <PageHeader eyebrow="Grocery List" title="What to buy" />
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-3)' }} />
      </div>
    </div>
  )

  // ── Empty state ───────────────────────────────────────────
  if (!effectivePlan) return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease' }}>
      <PageHeader eyebrow="Grocery List" title="What to buy"
        subtitle="Generate a plan first, or load a saved one below." />
      <EmptyState
        emoji="🛒"
        title="No active plan yet"
        message="Head to the Planner, generate your week, then come back for your full grocery list."
        action={() => navigate('/planner')}
        actionLabel={<><Sparkles size={16} /> Go to Planner <ArrowRight size={15} /></>}
      />
      {plans.length > 0 && (
        <div className="card p-5">
          <p className="font-semibold mb-4" style={{ fontSize: 15, color: 'var(--text)' }}>Or load a saved plan</p>
          <div className="space-y-2">
            {plans.map(plan => (
              <button key={plan.id} onClick={() => handleLoadPlan(plan.id)}
                className="w-full text-left px-5 py-3.5 rounded-xl transition-all"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <span className="font-semibold">{plan.name}</span>
                <span className="ml-3 nums" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {new Date(plan.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Main grocery list ─────────────────────────────────────
  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease' }}>

      {/* Offline banner */}
      {(!online || usingOfflineCache) && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl mb-4 no-print"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', animation: 'slideDown 0.3s ease' }}>
          <WifiOff size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
            {!online
              ? "You're offline — showing your saved grocery list. Changes sync when you're back online."
              : 'Showing your last cached grocery list.'}
          </p>
        </div>
      )}

      {/* Sticky header with built-in progress */}
      <PageHeader
        sticky
        eyebrow="Grocery List"
        title="What to buy"
        actions={
          <>
            <span className="badge flex items-center gap-1 no-print"
              style={{ background: online ? 'var(--brand-light)' : 'rgba(245,158,11,0.1)', color: online ? 'var(--brand-text)' : '#F59E0B', fontSize: 10.5 }}>
              {online ? <Wifi size={10} /> : <WifiOff size={10} />} {online ? 'Synced' : 'Offline'}
            </span>
            {(extraItems.length > 0 || Object.keys(removedItems).length > 0) && (
              <button onClick={resetToPlanDefault} className="btn-secondary btn-sm btn gap-1.5 tap-target no-print"
                title="Discard your added/removed items and rebuild from the current plan">
                <RotateCcw size={13} /> Reset to plan
              </button>
            )}
            <button onClick={handleShare} disabled={sharing} className="btn-primary btn-sm btn gap-1.5 tap-target">
              {sharing ? <Loader2 size={14} className="animate-[spin_1s_linear_infinite]" /> : <Share2 size={14} />} Share list
            </button>
          </>
        }
      />

      {/* Progress bar — compact, under sticky header */}
      <div className="rounded-2xl p-4 mb-4 mt-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', animation: 'slideUp 0.4s ease 0.05s both' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-semibold flex items-center gap-2" style={{ fontSize: 13.5, color: 'var(--text)' }}>
            Shopping progress
            <span className="badge" style={{ background: 'var(--brand-light)', color: 'var(--brand-text)', fontSize: 10.5 }}>
              👥 {servings} {servings === 1 ? 'person' : 'people'}
            </span>
          </span>
          <span className="nums font-bold" style={{ fontSize: 20, color: 'var(--brand)', letterSpacing: '-0.03em' }}>{progress}%</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--surface-3)' }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--brand)', transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
        <p className="nums" style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 8 }}>
          {checkedCount} of {allIngreds.length} items · {Object.keys(grouped).length} categories
        </p>
        {progress === 100 && (
          <p className="text-center font-semibold mt-3" style={{ fontSize: 14, color: 'var(--brand)', animation: 'scaleIn 0.3s ease' }}>
            🎉 All done! Happy cooking.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-5" style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
        <button onClick={selectAll} className="btn-secondary btn-sm btn gap-1.5"><CheckCircle2 size={14} /> Select all</button>
        <button onClick={clearAll} className="btn-secondary btn-sm btn gap-1.5"><Square size={14} /> Clear all</button>
        <button onClick={() => setShowQuantities(v => !v)} className="btn-sm btn gap-1.5"
          style={{ background: showQuantities ? 'var(--brand-light)' : 'var(--surface)', border: `1px solid ${showQuantities ? 'var(--brand)' : 'var(--border)'}`, color: showQuantities ? 'var(--brand-text)' : 'var(--text-3)' }}>
          🧮 {showQuantities ? 'Hide' : 'Show'} qty
        </button>
        <button onClick={() => setShowMeals(v => !v)} className="btn-sm btn gap-1.5"
          style={{ background: showMeals ? 'var(--brand-light)' : 'var(--surface)', border: `1px solid ${showMeals ? 'var(--brand)' : 'var(--border)'}`, color: showMeals ? 'var(--brand-text)' : 'var(--text-3)' }}>
          <Info size={14} /> {showMeals ? 'Hide' : 'Show'} meals
        </button>
        {plans.length > 0 && (
          <select className="input" style={{ width: 'auto', fontSize: 13.5, padding: '6px 12px' }}
            value={selectedPlanId} onChange={e => handleLoadPlan(e.target.value)}>
            <option value="">Switch plan…</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Add custom item */}
      <div className="flex gap-2 mb-5" style={{ animation: 'slideUp 0.4s ease 0.12s both' }}>
        <input className="input flex-1" placeholder="Add an item to your list…"
          value={newItemName} onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustomItem()} />
        <button onClick={addCustomItem} disabled={!newItemName.trim()}
          className="btn-primary btn gap-1.5 tap-target"><Plus size={15} /> Add</button>
      </div>

      {/* Categorised list */}
      <div className="space-y-2.5" style={{ animation: 'slideUp 0.4s ease 0.15s both' }}>
        {GROCERY_CATEGORY_ORDER.map(cat => {
          const items = grouped[cat]
          if (!items || !Object.keys(items).length) return null
          const catIngreds  = Object.keys(items).sort()
          const catChecked  = catIngreds.filter(i => checked[i]).length
          const allDone     = catChecked === catIngreds.length
          const isCollapsed = collapsedCats[cat]
          const accent      = CAT_COLORS[cat] || '#6B7280'

          return (
            <div key={cat} className="card overflow-hidden"
              style={{ borderColor: allDone ? 'var(--brand)' : 'var(--border)', transition: 'border-color 0.3s ease' }}>
              {/* Category header */}
              <button onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all"
                style={{ background: allDone ? 'var(--brand-light)' : 'transparent' }}>
                <div className="flex items-center justify-center shrink-0 rounded-xl"
                  style={{ width: 34, height: 34, background: `${accent}15`, border: `1px solid ${accent}30`, fontSize: 16 }}>
                  {CAT_ICONS[cat] || '📦'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold flex items-center gap-2" style={{ fontSize: 14, color: 'var(--text)' }}>
                    {cat}
                    {allDone && <Check size={13} style={{ color: 'var(--brand)' }} />}
                  </p>
                  <p className="nums" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{catChecked}/{catIngreds.length} items</p>
                </div>
                <div className="rounded-full overflow-hidden hidden sm:block" style={{ width: 56, height: 4, background: 'var(--surface-3)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(catChecked / catIngreds.length) * 100}%`, background: accent, transition: 'width 0.5s ease' }} />
                </div>
                {isCollapsed ? <ChevronRight size={16} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />}
              </button>

              {/* Items */}
              {!isCollapsed && catIngreds.map(ing => {
                const done  = !!checked[ing]
                const meals = groceryMap[ing] || []
                const qty   = estimateQuantity(ing, meals.length, servings)
                return (
                  <div key={ing}
                    className="w-full flex items-start gap-3.5 px-4 py-3 transition-all group"
                    style={{ borderTop: '1px solid var(--hairline)', background: done ? 'var(--brand-light)' : 'transparent' }}
                    onMouseEnter={e => { if (!done) e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = done ? 'var(--brand-light)' : 'transparent' }}>
                    <button onClick={() => toggle(ing)} className="flex-1 flex items-start gap-3.5 text-left tap-target min-w-0">
                      <div className="shrink-0 mt-0.5 flex items-center justify-center transition-all"
                        style={{
                          width: 22, height: 22, borderRadius: 7,
                          border: done ? 'none' : '2px solid var(--border-2)',
                          background: done ? accent : 'var(--surface)',
                          transform: done ? 'scale(1.05)' : 'scale(1)',
                        }}>
                        {done && (
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="font-medium capitalize" style={{ fontSize: 14, color: done ? 'var(--text-3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                            {ing}
                          </p>
                          {showQuantities && qty && (
                            <span className="nums shrink-0" style={{ fontSize: 11.5, color: done ? 'var(--text-3)' : accent, fontWeight: 600 }}>{qty}</span>
                          )}
                        </div>
                        {showMeals && meals.length > 0 && (
                          <p style={{ fontSize: 11.5, color: done ? 'var(--border-2)' : 'var(--text-3)', marginTop: 1 }}>
                            {meals.slice(0, 3).join(' · ')}{meals.length > 3 ? ` +${meals.length - 3}` : ''}
                          </p>
                        )}
                      </div>
                    </button>
                    <button onClick={() => removeItem(ing)} aria-label={`Remove ${ing}`}
                      className="shrink-0 flex items-center justify-center rounded-lg tap-target transition-all"
                      style={{ width: 30, height: 30, color: 'var(--text-3)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--danger)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}>
                      <X size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
