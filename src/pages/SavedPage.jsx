import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '../hooks/usePlans'
import { DAYS, CATEGORIES, CATEGORY_ICONS } from '../lib/mealLogic'
import { savePlanToSession } from './GroceryPage'
import { exportToPDF } from '../lib/pdfExport'
import { useAuth } from '../hooks/useAuth'
import {
  Bookmark, Trash2, Eye, Download,
  ShoppingCart, Loader2, CalendarDays
} from 'lucide-react'

export default function SavedPage() {
  const { plans, loading, deletePlan, loadPlan } = usePlans()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [expandedId, setExpandedId]   = useState(null)
  const [deletingId, setDeletingId]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  function handleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  function handleLoadToGrocery(plan) {
    const loaded = loadPlan(plan)
    savePlanToSession(loaded)
    navigate('/grocery')
  }

  function handleLoadToPlanner(plan) {
    const loaded = loadPlan(plan)
    savePlanToSession(loaded)
    navigate('/planner')
  }

  function handleExportPDF(plan) {
    const loaded = loadPlan(plan)
    exportToPDF(loaded, profile?.username || 'Your')
  }

  async function handleDelete(plan) {
    setDeletingId(plan.id)
    await deletePlan(plan.id)
    setDeletingId(null)
    setConfirmDelete(null)
    if (expandedId === plan.id) setExpandedId(null)
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  function getPlanPreview(plan) {
    try {
      const parsed = typeof plan.plan_json === 'string'
        ? JSON.parse(plan.plan_json)
        : plan.plan_json
      // Count unique meals
      let count = 0
      const names = []
      Object.values(parsed).forEach(day => {
        Object.values(day).forEach(meal => {
          count++
          if (names.length < 3) names.push(meal.item_name)
        })
      })
      return { count, preview: names }
    } catch {
      return { count: 0, preview: [] }
    }
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-sage-400" size={32} />
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title">Saved Plans</h1>
        <p className="text-sage-500 text-sm mt-1">
          {plans.length} {plans.length === 1 ? 'plan' : 'plans'} saved
        </p>
      </div>

      {/* Empty state */}
      {plans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-sage-100 flex items-center justify-center mb-4">
            <Bookmark size={36} className="text-sage-400" />
          </div>
          <h3 className="font-display text-xl text-sage-800 mb-2">No saved plans yet</h3>
          <p className="text-sage-400 text-sm max-w-xs mb-6">
            Generate a weekly plan and save it with a name to find it here.
          </p>
          <button onClick={() => navigate('/planner')} className="btn-primary btn">
            <CalendarDays size={16} /> Go to Planner
          </button>
        </div>
      )}

      {/* Plan list */}
      <div className="space-y-4">
        {plans.map((plan, idx) => {
          const { count, preview } = getPlanPreview(plan)
          const isExpanded = expandedId === plan.id

          let parsedPlan = null
          if (isExpanded) {
            try {
              parsedPlan = typeof plan.plan_json === 'string'
                ? JSON.parse(plan.plan_json)
                : plan.plan_json
            } catch {}
          }

          return (
            <div
              key={plan.id}
              className="card overflow-hidden animate-slide-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Plan header row */}
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Bookmark size={14} className="text-sage-400 shrink-0" />
                    <h3 className="font-display text-base text-sage-900 truncate">
                      {plan.name}
                    </h3>
                  </div>
                  <p className="text-xs text-sage-400 ml-5">
                    {formatDate(plan.created_at)} · {count} meals
                  </p>
                  {preview.length > 0 && (
                    <p className="text-xs text-sage-400 ml-5 mt-0.5 truncate">
                      {preview.join(', ')}{count > 3 ? '…' : ''}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap shrink-0">
                  <button
                    onClick={() => handleExpand(plan.id)}
                    className="btn-secondary btn-sm btn"
                  >
                    <Eye size={13} />
                    {isExpanded ? 'Collapse' : 'View'}
                  </button>
                  <button
                    onClick={() => handleLoadToGrocery(plan)}
                    className="btn-secondary btn-sm btn"
                  >
                    <ShoppingCart size={13} /> Grocery
                  </button>
                  <button
                    onClick={() => handleExportPDF(plan)}
                    className="btn-secondary btn-sm btn"
                  >
                    <Download size={13} /> PDF
                  </button>
                  <button
                    onClick={() => setConfirmDelete(plan)}
                    className="btn-danger btn-sm btn"
                    disabled={deletingId === plan.id}
                  >
                    {deletingId === plan.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
                  </button>
                </div>
              </div>

              {/* Expanded plan view */}
              {isExpanded && parsedPlan && (
                <div className="border-t border-cream-100 px-5 py-4 animate-slide-up">
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-xs min-w-[480px]">
                      <thead>
                        <tr>
                          <th className="text-left pb-2 pr-3 font-semibold text-sage-500 w-24">Day</th>
                          {CATEGORIES.map(cat => (
                            <th key={cat} className="text-left pb-2 pr-3 font-semibold text-sage-500">
                              {CATEGORY_ICONS[cat]} {cat}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map((day, dayIdx) => (
                          <tr key={day} className="border-t border-cream-50">
                            <td className="py-2 pr-3 font-medium text-sage-700 align-top pt-3">
                              {day.slice(0, 3)}
                            </td>
                            {CATEGORIES.map(cat => {
                              const meal = parsedPlan[dayIdx]?.[cat]
                              return (
                                <td key={cat} className="py-2 pr-3 align-top pt-3 text-sage-600 leading-relaxed">
                                  {meal ? meal.item_name : <span className="text-sage-300">—</span>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-cream-100">
                    <button
                      onClick={() => handleLoadToPlanner(plan)}
                      className="btn-primary btn-sm btn"
                    >
                      <CalendarDays size={13} /> Load into Planner
                    </button>
                    <button
                      onClick={() => handleLoadToGrocery(plan)}
                      className="btn-secondary btn-sm btn"
                    >
                      <ShoppingCart size={13} /> View Grocery List
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm card p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-clay-500" />
            </div>
            <h3 className="font-display text-lg text-sage-900 mb-1">Delete plan?</h3>
            <p className="text-sm text-sage-500 mb-5">
              "<strong>{confirmDelete.name}</strong>" will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary btn flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="btn-danger btn flex-1"
                disabled={!!deletingId}
              >
                {deletingId ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
