import { useState, useRef } from 'react'
import { useMeals } from '../hooks/useMeals'
import { parseMealsFromFile, exportMealsAsJSON, exportMealsAsCSV } from '../lib/importExport'
import { DIET_LABELS, CATEGORIES } from '../lib/mealLogic'
import {
  Plus, Search, Upload, Download, Edit2, Trash2,
  Loader2, X, ChevronDown, BookOpen, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

const DIET_OPTIONS  = ['veg','vegan','nonveg']
const EMPTY_FORM    = { item_name: '', category: 'Breakfast', ingredients: '', diet_type: 'veg', notes: '' }

export default function RecipesPage() {
  const [search,   setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [dietFilter, setDietFilter] = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [editMeal,  setEditMeal]  = useState(null)   // meal object being edited
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [importErrors, setImportErrors] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileRef = useRef(null)

  const { meals, loading, addMeal, updateMeal, deleteMeal, bulkAddMeals } = useMeals({
    search: search || undefined,
    category: catFilter || undefined,
    diet_types: dietFilter.length > 0 ? dietFilter : undefined,
  })

  // ── Form helpers ───────────────────────────────────────────
  function openAdd() {
    setForm(EMPTY_FORM)
    setEditMeal(null)
    setShowForm(true)
  }

  function openEdit(meal) {
    setForm({
      item_name:   meal.item_name,
      category:    meal.category,
      ingredients: meal.ingredients,
      diet_type:   meal.diet_type,
      notes:       meal.notes || '',
    })
    setEditMeal(meal)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditMeal(null)
    setForm(EMPTY_FORM)
  }

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.item_name.trim() || !form.ingredients.trim()) {
      toast.error('Name and ingredients are required')
      return
    }
    setSubmitting(true)
    const payload = {
      item_name:   form.item_name.trim(),
      category:    form.category,
      ingredients: form.ingredients.trim(),
      diet_type:   form.diet_type,
      notes:       form.notes.trim() || null,
    }

    if (editMeal) {
      await updateMeal(editMeal.id, payload)
    } else {
      await addMeal(payload)
    }
    setSubmitting(false)
    closeForm()
  }

  async function handleDelete(meal) {
    await deleteMeal(meal.id)
    setDeleteConfirm(null)
  }

  // ── Import ─────────────────────────────────────────────────
  async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportErrors([])

    const { valid, errors } = await parseMealsFromFile(file)
    if (errors.length > 0) setImportErrors(errors)
    if (valid.length > 0)  await bulkAddMeals(valid)

    setImporting(false)
    fileRef.current.value = ''
  }

  // ── Group by category for display ─────────────────────────
  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = meals.filter(m => m.category === cat)
    return acc
  }, {})

  const showCategories = catFilter ? [catFilter] : CATEGORIES

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title">My Recipes</h1>
          <p className="text-sage-500 text-sm mt-1">{meals.length} meals in your library</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Import */}
          <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFileImport} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="btn-secondary btn-sm btn"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import
          </button>

          {/* Export */}
          <div className="relative group">
            <button className="btn-secondary btn-sm btn">
              <Download size={14} /> Export <ChevronDown size={12} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-cream-200 rounded-xl shadow-card z-10 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              <button onClick={() => exportMealsAsJSON(meals)} className="w-full text-left px-3 py-2 text-sm hover:bg-cream-50">
                Export as JSON
              </button>
              <button onClick={() => exportMealsAsCSV(meals)} className="w-full text-left px-3 py-2 text-sm hover:bg-cream-50">
                Export as CSV
              </button>
            </div>
          </div>

          <button onClick={openAdd} className="btn-primary btn-sm btn">
            <Plus size={14} /> Add Meal
          </button>
        </div>
      </div>

      {/* Import errors */}
      {importErrors.length > 0 && (
        <div className="card border-clay-200 bg-clay-50 p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-clay-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-clay-700 mb-1">Import issues ({importErrors.length})</p>
              <ul className="text-xs text-clay-600 space-y-0.5">
                {importErrors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                {importErrors.length > 5 && <li>• …and {importErrors.length - 5} more</li>}
              </ul>
            </div>
            <button onClick={() => setImportErrors([])} className="ml-auto text-clay-400 hover:text-clay-600">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-300" />
          <input
            className="input pl-9"
            placeholder="Search meals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-36"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          {DIET_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDietFilter(prev =>
                prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
              )}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ` +
                (dietFilter.includes(d)
                  ? 'bg-sage-600 text-white border-sage-600'
                  : 'bg-white text-sage-500 border-cream-300')
              }
            >
              {DIET_LABELS[d]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meals grid by category */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <BookOpen size={40} className="text-sage-200 mb-3" />
          <p className="font-display text-lg text-sage-700 mb-1">No meals found</p>
          <p className="text-sm text-sage-400">Try changing your filters or add a new meal.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {showCategories.map(category => {
            const catMeals = grouped[category]
            if (catMeals.length === 0) return null

            return (
              <section key={category}>
                <h2 className="font-display text-lg text-sage-800 mb-3 flex items-center gap-2">
                  {category}
                  <span className="text-xs font-body text-sage-400 font-normal">({catMeals.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catMeals.map(meal => {
                    const diet = DIET_LABELS[meal.diet_type]
                    return (
                      <div key={meal.id} className="card-hover p-4 group animate-scale-in">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sage-900 text-sm leading-tight">
                            {meal.item_name}
                          </h3>
                          {diet && (
                            <span className={`badge ${diet.color} shrink-0`}>{diet.label}</span>
                          )}
                        </div>
                        <p className="text-xs text-sage-500 leading-relaxed mb-3">
                          {meal.ingredients?.split(',').map(i => i.trim()).join(' · ')}
                        </p>
                        {meal.notes && (
                          <p className="text-xs text-sage-400 italic truncate mb-3">{meal.notes}</p>
                        )}
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(meal)}
                            className="btn-ghost btn-sm btn text-sage-500"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(meal)}
                            className="btn-danger btn-sm btn"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md card p-5 sm:p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-sage-900">
                {editMeal ? 'Edit Meal' : 'Add New Meal'}
              </h3>
              <button onClick={closeForm} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">Meal name *</label>
                <input className="input" value={form.item_name}
                  onChange={e => setField('item_name', e.target.value)}
                  placeholder="e.g. Avocado Toast" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Category *</label>
                  <select className="input" value={form.category}
                    onChange={e => setField('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Diet type *</label>
                  <select className="input" value={form.diet_type}
                    onChange={e => setField('diet_type', e.target.value)}>
                    {DIET_OPTIONS.map(d => (
                      <option key={d} value={d}>{DIET_LABELS[d]?.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Ingredients * (comma-separated)</label>
                <textarea className="input resize-none" rows={2}
                  value={form.ingredients}
                  onChange={e => setField('ingredients', e.target.value)}
                  placeholder="e.g. bread, avocado, olive oil, salt" required />
              </div>

              <div>
                <label className="input-label">Notes / recipe URL (optional)</label>
                <input className="input" value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="https://... or any notes" />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeForm} className="btn-secondary btn flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary btn flex-1">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editMeal ? 'Save changes' : 'Add meal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm card p-5 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-clay-500" />
            </div>
            <h3 className="font-display text-lg text-sage-900 mb-1">Delete meal?</h3>
            <p className="text-sm text-sage-500 mb-4">
              "<strong>{deleteConfirm.item_name}</strong>" will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary btn flex-1">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger btn flex-1">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
