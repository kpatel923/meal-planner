import { useState, useRef, useEffect } from 'react'
import { useMeals } from '../hooks/useMeals'
import { parseMealsFromFile, exportMealsAsJSON, exportMealsAsCSV } from '../lib/importExport'
import { DIET_LABELS, CATEGORIES } from '../lib/mealLogic'
import {
  Plus, Search, Upload, Download, Edit2, Trash2,
  Loader2, X, BookOpen, AlertTriangle, ChevronDown,
  ExternalLink, Link, Play, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'

const DIET_OPTIONS = ['veg','vegan','nonveg']
const EMPTY = { item_name:'', category:'Breakfast', ingredients:'', diet_type:'veg', notes:'' }

const DIET_COLORS = {
  veg:    { bg:'rgba(31,158,98,0.1)',  text:'#1F9E62', border:'rgba(31,158,98,0.25)' },
  vegan:  { bg:'rgba(11,96,59,0.12)', text:'#3AB87D', border:'rgba(58,184,125,0.25)' },
  nonveg: { bg:'rgba(212,80,42,0.1)', text:'#D4502A', border:'rgba(212,80,42,0.25)' },
}

const CAT_ICONS = { Breakfast:'🍳', Lunch:'🥗', Dinner:'🍝', Snack:'🍎' }

function getLinkIcon(url) {
  if (!url) return <Link size={12} />
  if (url.includes('youtube') || url.includes('youtu.be')) return <Play size={12} />
  if (url.includes('instagram')) return <Camera size={12} />
  return <ExternalLink size={12} />
}

function getLinkLabel(url) {
  if (!url) return 'View'
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube'
  if (url.includes('instagram')) return 'Instagram'
  return 'Recipe'
}

export default function RecipesPage() {
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('')
  const [dietFilter,   setDietFilter]   = useState([])
  const [showForm,     setShowForm]     = useState(false)
  const [editMeal,     setEditMeal]     = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [submitting,   setSubmitting]   = useState(false)
  const [importing,    setImporting]    = useState(false)
  const [importErrors, setImportErrors] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showExport,   setShowExport]   = useState(false)
  const fileRef   = useRef(null)
  const exportRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { meals, loading, addMeal, updateMeal, deleteMeal, bulkAddMeals } = useMeals({
    search:     search || undefined,
    category:   catFilter || undefined,
    diet_types: dietFilter.length ? dietFilter : undefined,
  })

  function openAdd()       { setForm(EMPTY); setEditMeal(null); setShowForm(true) }
  function openEdit(meal)  {
    setForm({ item_name:meal.item_name, category:meal.category, ingredients:meal.ingredients, diet_type:meal.diet_type, notes:meal.notes||'' })
    setEditMeal(meal); setShowForm(true)
  }
  function closeForm()     { setShowForm(false); setEditMeal(null); setForm(EMPTY) }
  function setField(k, v)  { setForm(p => ({ ...p, [k]:v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.item_name.trim() || !form.ingredients.trim()) { toast.error('Name and ingredients required'); return }
    setSubmitting(true)
    const payload = {
      item_name:   form.item_name.trim(),
      category:    form.category,
      ingredients: form.ingredients.trim(),
      diet_type:   form.diet_type,
      notes:       form.notes.trim() || null,
    }
    editMeal ? await updateMeal(editMeal.id, payload) : await addMeal(payload)
    setSubmitting(false); closeForm()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteMeal(deleteTarget.id); setDeleteTarget(null)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); setImportErrors([])
    const { valid, errors } = await parseMealsFromFile(file)
    if (errors.length) setImportErrors(errors)
    if (valid.length)  await bulkAddMeals(valid)
    setImporting(false); fileRef.current.value = ''
  }

  const grouped = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: meals.filter(m => m.category === cat) }), {})
  const showCats = catFilter ? [catFilter] : CATEGORIES

  return (
    <div className="page-container" style={{ animation:'fadeIn 0.35s ease' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <span className="page-eyebrow">Recipe Library</span>
          <h1 className="section-title">My Recipes</h1>
          <p className="mt-1.5" style={{ color:'var(--text-3)', fontSize:'15px' }}>{meals.length} meals in your library</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary btn">
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import
          </button>

          <div className="relative" ref={exportRef}>
            <button onClick={() => setShowExport(v => !v)} className="btn-secondary btn">
              <Download size={16} /> Export
              <ChevronDown size={13} className={`transition-transform duration-200 ${showExport ? 'rotate-180' : ''}`} />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-2xl overflow-hidden z-20"
                style={{ background:'var(--surface)', border:'1.5px solid var(--border)', boxShadow:'0 16px 48px rgba(0,0,0,0.15)', animation:'scaleIn 0.15s ease' }}>
                <button onClick={() => { exportMealsAsJSON(meals); setShowExport(false) }}
                  className="w-full text-left px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
                  style={{ fontSize:'14px', color:'var(--text)' }}>
                  📄 Export as JSON
                </button>
                <button onClick={() => { exportMealsAsCSV(meals); setShowExport(false) }}
                  className="w-full text-left px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
                  style={{ fontSize:'14px', color:'var(--text)', borderTop:'1px solid var(--border)' }}>
                  📊 Export as CSV
                </button>
              </div>
            )}
          </div>

          <button onClick={openAdd} className="btn-primary btn">
            <Plus size={17} /> Add Meal
          </button>
        </div>
      </div>

      {/* Import errors */}
      {importErrors.length > 0 && (
        <div className="rounded-2xl p-4 mb-5 flex items-start gap-3"
          style={{ background:'rgba(212,80,42,0.08)', border:'1.5px solid rgba(212,80,42,0.2)', animation:'slideDown 0.3s ease' }}>
          <AlertTriangle size={17} style={{ color:'#D4502A', marginTop:2, flexShrink:0 }} />
          <div className="flex-1">
            <p className="font-semibold mb-1" style={{ color:'#D4502A', fontSize:'14px' }}>
              Import issues ({importErrors.length})
            </p>
            <ul className="space-y-0.5" style={{ fontSize:'13px', color:'var(--text-3)' }}>
              {importErrors.slice(0,5).map((e,i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
          <button onClick={() => setImportErrors([])} style={{ color:'var(--text-3)' }}><X size={15} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-7" style={{ animation:'slideUp 0.4s ease 0.05s both' }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft:'44px' }} placeholder="Search your recipes…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-44" style={{ color:'var(--text)' }}
          value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
        </select>
        <div className="flex gap-2">
          {DIET_OPTIONS.map(d => {
            const active = dietFilter.includes(d)
            const dc = DIET_COLORS[d]
            return (
              <button key={d}
                onClick={() => setDietFilter(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}
                className="px-4 py-2 rounded-full font-semibold transition-all duration-200 active:scale-95"
                style={{ fontSize:'13px', border:`2px solid ${active ? dc.border : 'var(--border)'}`, background: active ? dc.bg : 'transparent', color: active ? dc.text : 'var(--text-3)' }}>
                {DIET_LABELS[d]?.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Meals grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_,i) => <div key={i} className="skeleton h-36 rounded-2xl" style={{ animationDelay:`${i*60}ms` }} />)}
        </div>
      ) : meals.length === 0 ? (
        <div className="flex flex-col items-center py-28 text-center" style={{ animation:'fadeIn 0.6s ease' }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
            style={{ background:'var(--surface-2)', border:'1.5px solid var(--border)', fontSize:'36px' }}>
            <BookOpen size={32} style={{ color:'var(--text-3)' }} />
          </div>
          <p className="font-display font-semibold mb-2" style={{ fontSize:'22px', color:'var(--text)', letterSpacing:'-0.03em' }}>No meals found</p>
          <p style={{ color:'var(--text-3)', fontSize:'15px' }}>Try a different filter, or add a new meal above.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {showCats.map(category => {
            const catMeals = grouped[category]
            if (!catMeals?.length) return null
            return (
              <section key={category} style={{ animation:'slideUp 0.4s ease both' }}>
                <div className="flex items-center gap-3 mb-4">
                  <span style={{ fontSize:'22px' }}>{CAT_ICONS[category]}</span>
                  <h2 className="font-display font-semibold" style={{ fontSize:'22px', color:'var(--text)', letterSpacing:'-0.03em' }}>
                    {category}
                  </h2>
                  <span className="font-medium px-2.5 py-0.5 rounded-full"
                    style={{ fontSize:'12px', background:'var(--surface-2)', color:'var(--text-3)', border:'1px solid var(--border)' }}>
                    {catMeals.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catMeals.map(meal => {
                    const dc = DIET_COLORS[meal.diet_type] || DIET_COLORS.veg
                    const hasLink = meal.notes && (meal.notes.startsWith('http') || meal.notes.startsWith('www'))
                    return (
                      <div key={meal.id} className="card-hover p-5 group flex flex-col"
                        style={{ animation:'scaleIn 0.2s ease both' }}>
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="font-semibold leading-snug" style={{ fontSize:'16px', color:'var(--text)', letterSpacing:'-0.02em' }}>
                            {meal.item_name}
                          </h3>
                          <span className="badge shrink-0" style={{ background:dc.bg, color:dc.text, border:`1px solid ${dc.border}` }}>
                            {DIET_LABELS[meal.diet_type]?.label}
                          </span>
                        </div>

                        {/* Ingredients */}
                        <p className="leading-relaxed flex-1 mb-4" style={{ fontSize:'13px', color:'var(--text-3)', lineHeight:'1.6' }}>
                          {meal.ingredients?.split(',').map(i => i.trim()).join(' · ')}
                        </p>

                        {/* Link if exists */}
                        {hasLink && (
                          <a href={meal.notes} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2 transition-all duration-150 hover:opacity-80 self-start"
                            style={{ fontSize:'12px', fontWeight:600, background:dc.bg, color:dc.text, border:`1px solid ${dc.border}` }}>
                            {getLinkIcon(meal.notes)}
                            {getLinkLabel(meal.notes)}
                          </a>
                        )}

                        {/* Non-link notes */}
                        {meal.notes && !hasLink && (
                          <p className="italic mb-3 leading-relaxed" style={{ fontSize:'12px', color:'var(--text-3)' }}>
                            💬 {meal.notes}
                          </p>
                        )}

                        {/* Actions — reveal on hover */}
                        <div className="flex gap-2 pt-3 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
                          style={{ borderTop:'1px solid var(--border)' }}>
                          <button onClick={() => openEdit(meal)}
                            className="btn-ghost btn-sm btn flex-1 justify-center">
                            <Edit2 size={13} /> Edit
                          </button>
                          <button onClick={() => setDeleteTarget(meal)}
                            className="btn-danger btn-sm btn flex-1 justify-center">
                            <Trash2 size={13} /> Delete
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

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(12px)', animation:'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="w-full max-w-lg card p-6 sm:p-7" style={{ animation:'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-semibold" style={{ fontSize:'22px', color:'var(--text)', letterSpacing:'-0.03em' }}>
                {editMeal ? '✏️ Edit meal' : '✨ Add new meal'}
              </h3>
              <button onClick={closeForm} className="btn-ghost btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">Meal name *</label>
                <input className="input" value={form.item_name}
                  onChange={e => setField('item_name', e.target.value)}
                  placeholder="e.g. Avocado Toast" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Category *</label>
                  <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Diet type *</label>
                  <select className="input" value={form.diet_type} onChange={e => setField('diet_type', e.target.value)}>
                    {DIET_OPTIONS.map(d => <option key={d} value={d}>{DIET_LABELS[d]?.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Ingredients * (comma-separated)</label>
                <textarea className="input resize-none" rows={2}
                  value={form.ingredients} onChange={e => setField('ingredients', e.target.value)}
                  placeholder="bread, avocado, olive oil, salt" required />
              </div>
              <div>
                <label className="input-label">Recipe link or notes (optional)</label>
                <input className="input" value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="https://youtube.com/... or Instagram link or any note" />
                <p style={{ fontSize:'11px', color:'var(--text-3)', marginTop:'5px' }}>
                  Paste a YouTube, Instagram, or any recipe URL — it'll show as a clickable link on your card.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary btn flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary btn flex-1">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editMeal ? 'Save changes' : '+ Add meal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(12px)', animation:'fadeIn 0.2s ease' }}>
          <div className="w-full max-w-sm card p-7 text-center" style={{ animation:'scaleIn 0.2s ease' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background:'rgba(212,80,42,0.1)', border:'1.5px solid rgba(212,80,42,0.2)', fontSize:'24px' }}>
              🗑
            </div>
            <h3 className="font-display font-semibold mb-1.5" style={{ fontSize:'20px', color:'var(--text)', letterSpacing:'-0.03em' }}>
              Delete this meal?
            </h3>
            <p style={{ fontSize:'14px', color:'var(--text-3)', marginBottom:'24px' }}>
              "<strong style={{ color:'var(--text)' }}>{deleteTarget.item_name}</strong>" will be permanently removed from your library.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary btn flex-1">Keep it</button>
              <button onClick={handleDelete} className="btn-danger btn flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
