import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '../hooks/usePlans'
import { usePlanStore } from '../hooks/usePlanStore'
import { DAYS, CATEGORIES, CATEGORY_ICONS } from '../lib/mealLogic'
import { exportToPDF } from '../lib/pdfExport'
import { useAuth } from '../hooks/useAuth'
import { Bookmark, Trash2, Eye, EyeOff, Download, ShoppingCart, Loader2, CalendarDays, Sparkles, CalendarCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SavedPage() {
  const { plans, loading, deletePlan, loadPlan } = usePlans()
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const { loadPlan: storeLoadPlan, servings } = usePlanStore()

  const [expandedId,    setExpandedId]    = useState(null)
  const [deletingId,    setDeletingId]    = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  function handleLoadGrocery(plan) { storeLoadPlan(loadPlan(plan)); toast.success(`Loaded "${plan.name}"`); navigate('/grocery') }
  function handleLoadPlanner(plan) { storeLoadPlan(loadPlan(plan)); toast.success(`Loaded "${plan.name}" into planner`); navigate('/planner') }
  function handlePDF(plan)         { exportToPDF(loadPlan(plan), profile?.username, servings) }

  async function handleDelete(plan) {
    setDeletingId(plan.id)
    await deletePlan(plan.id)
    setDeletingId(null)
    setConfirmDelete(null)
    if (expandedId === plan.id) setExpandedId(null)
  }

  function getPreview(plan) {
    try {
      const p     = typeof plan.plan_json === 'string' ? JSON.parse(plan.plan_json) : plan.plan_json
      const names = []
      let count   = 0
      Object.values(p).forEach(day => Object.values(day).forEach(meal => {
        count++
        if (names.length < 3) names.push(meal.item_name)
      }))
      return { count, names }
    } catch { return { count: 0, names: [] } }
  }

  if (loading) return (
    <div className="page-container space-y-4 mt-8">
      {[...Array(3)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease' }}>

      {/* Header */}
      <div className="mb-8">
        <span className="page-eyebrow">Saved Plans</span>
        <h1 className="section-title">Your saved weeks</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', marginTop: '6px' }}>
          {plans.length} {plans.length === 1 ? 'plan' : 'plans'} saved
        </p>
      </div>

      {/* Empty state */}
      {plans.length === 0 && (
        <div className="flex flex-col items-center py-28 text-center" style={{ animation: 'fadeIn 0.6s ease' }}>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: 'linear-gradient(135deg,rgba(255,90,54,0.1),rgba(255,90,54,0.04))', border: '1px solid rgba(255,90,54,0.15)' }}>
            <Bookmark size={36} style={{ color: 'var(--brand)' }} />
          </div>
          <h3 className="font-display font-semibold mb-2.5" style={{ fontSize: '24px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
            No saved plans yet
          </h3>
          <p style={{ color: 'var(--text-3)', fontSize: '15px', maxWidth: '320px', marginBottom: '28px', lineHeight: '1.6' }}>
            Generate a weekly plan and save it with a name — you'll find it here.
          </p>
          <button onClick={() => navigate('/planner')} className="btn-primary btn btn-lg">
            <Sparkles size={17} /> Generate a plan
          </button>
        </div>
      )}

      {/* Plans */}
      <div className="space-y-4">
        {plans.map((plan, idx) => {
          const { count, names } = getPreview(plan)
          const isExpanded       = expandedId === plan.id
          let parsed             = null
          if (isExpanded) {
            try { parsed = typeof plan.plan_json === 'string' ? JSON.parse(plan.plan_json) : plan.plan_json } catch {}
          }

          return (
            <div key={plan.id} className="card overflow-hidden"
              style={{ animation: `slideUp 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 50}ms both` }}>

              {/* Header row */}
              <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(255,90,54,0.1)', border: '1px solid rgba(255,90,54,0.2)' }}>
                      <Bookmark size={15} style={{ color: 'var(--brand)' }} />
                    </div>
                    <h3 className="font-display font-semibold truncate" style={{ fontSize: '18px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      {plan.name}
                    </h3>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', paddingLeft: '44px' }}>
                    {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}{count} meals
                    {names.length > 0 && ` · ${names.slice(0,2).join(', ')}${count > 2 ? '…' : ''}`}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap shrink-0">
                  <button onClick={() => handleLoadPlanner(plan)} className="btn-primary btn-sm btn gap-2">
                    <CalendarCheck size={14} /> Load into planner
                  </button>
                  <button onClick={() => setExpandedId(isExpanded ? null : plan.id)} className="btn-secondary btn-sm btn gap-2">
                    {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isExpanded ? 'Collapse' : 'View'}
                  </button>
                  <button onClick={() => handleLoadGrocery(plan)} className="btn-secondary btn-sm btn gap-2">
                    <ShoppingCart size={14} /> Grocery
                  </button>
                  <button onClick={() => handlePDF(plan)} className="btn-secondary btn-sm btn gap-2">
                    <Download size={14} /> PDF
                  </button>
                  <button onClick={() => setConfirmDelete(plan)} disabled={deletingId === plan.id}
                    className="btn-danger btn-sm btn">
                    {deletingId === plan.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded table */}
              {isExpanded && parsed && (
                <div className="px-6 pb-6" style={{ borderTop: '1px solid var(--border)', animation: 'slideDown 0.25s ease both' }}>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full" style={{ minWidth: '520px' }}>
                      <thead>
                        <tr>
                          <th className="text-left pr-4 pb-3 w-24" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>Day</th>
                          {CATEGORIES.map(cat => (
                            <th key={cat} className="text-left pr-4 pb-3" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>
                              {CATEGORY_ICONS[cat]} {cat}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map((day, di) => (
                          <tr key={day} style={{ borderTop: '1px solid var(--border)' }}>
                            <td className="py-3 pr-4 font-semibold" style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                              {day.slice(0, 3)}
                            </td>
                            {CATEGORIES.map(cat => {
                              const meal = parsed[di]?.[cat]
                              return (
                                <td key={cat} className="py-3 pr-4" style={{ fontSize: '13px', color: 'var(--text)' }}>
                                  {meal ? meal.item_name : <span style={{ color: 'var(--border)' }}>—</span>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button onClick={() => handleLoadPlanner(plan)} className="btn-primary btn">
                      <CalendarDays size={16} /> Load into Planner
                    </button>
                    <button onClick={() => handleLoadGrocery(plan)} className="btn-secondary btn">
                      <ShoppingCart size={16} /> View Grocery List
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}>
          <div className="w-full max-w-sm card p-7 text-center" style={{ animation: 'scaleIn 0.2s ease' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(212,61,43,0.1)', border: '1px solid rgba(212,61,43,0.2)', fontSize: '26px' }}>
              🗑
            </div>
            <h3 className="font-display font-semibold mb-2" style={{ fontSize: '20px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
              Delete this plan?
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '24px', lineHeight: '1.6' }}>
              "<strong style={{ color: 'var(--text)' }}>{confirmDelete.name}</strong>" will be gone forever.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary btn flex-1">Keep it</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={!!deletingId} className="btn-danger btn flex-1">
                {deletingId ? <Loader2 size={15} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
