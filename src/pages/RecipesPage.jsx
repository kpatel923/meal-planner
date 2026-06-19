import { useState, useRef, useEffect } from 'react'
import { useMeals } from '../hooks/useMeals'
import { parseMealsFromFile, exportMealsAsJSON, exportMealsAsCSV } from '../lib/importExport'
import { DIET_LABELS, CATEGORIES } from '../lib/mealLogic'
import {
  Plus, Search, Upload, Download, Edit2, Trash2,
  Loader2, X, BookOpen, AlertTriangle, ChevronDown,
  ExternalLink, Link2, Play, Camera, FileText,
  Sparkles, Clock, Users
} from 'lucide-react'
import toast from 'react-hot-toast'

const DIET_OPTIONS = ['veg','vegan','nonveg']
const EMPTY = { item_name:'', category:'Breakfast', ingredients:'', diet_type:'veg', video_url:'', written_url:'', detail_notes:'' }

const DIET_COLORS = {
  veg:    { bg:'rgba(31,158,98,0.1)',  text:'#1F9E62', border:'rgba(31,158,98,0.25)' },
  vegan:  { bg:'rgba(11,96,59,0.12)', text:'#3AB87D', border:'rgba(58,184,125,0.25)' },
  nonveg: { bg:'rgba(212,80,42,0.1)', text:'#D4502A', border:'rgba(212,80,42,0.25)' },
}

const SOURCE_BADGES = {
  ai:     { label: 'AI', icon: <Sparkles size={10} />, bg: 'rgba(99,102,241,0.12)', text: '#6366F1' },
  import: { label: 'Imported', icon: null, bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
}

const CAT_ICONS = { Breakfast:'🍳', Lunch:'🥗', Dinner:'🍝', Snack:'🍎' }

function getVideoMeta(url) {
  if (!url) return null
  if (url.includes('youtube') || url.includes('youtu.be')) return { icon: <Play size={14} />, label: 'Watch Video', platform: 'YouTube', color: '#FF0000' }
  if (url.includes('instagram')) return { icon: <Camera size={14} />, label: 'Watch Video', platform: 'Instagram', color: '#E1306C' }
  if (url.includes('tiktok')) return { icon: <Play size={14} />, label: 'Watch Video', platform: 'TikTok', color: '#000000' }
  return { icon: <Play size={14} />, label: 'Watch Video', platform: 'Video', color: 'var(--brand)' }
}

// ── Recipe Detail Modal ──────────────────────────────────────────────
function RecipeDetailModal({ meal, onClose, onEdit, onDelete }) {
  if (!meal) return null
  const dc = DIET_COLORS[meal.diet_type] || DIET_COLORS.veg
  const videoMeta = getVideoMeta(meal.video_url)
  const ingredients = meal.ingredients?.split(',').map(i => i.trim()).filter(Boolean) || []
  const sourceBadge = SOURCE_BADGES[meal.source]

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="modal-panel">
        {/* Header band */}
        <div className="relative p-6 sm:p-8" style={{ background: `linear-gradient(135deg, ${dc.bg}, transparent)`, borderBottom: '1.5px solid var(--border)' }}>
          <button onClick={onClose} className="btn-ghost btn-icon absolute top-4 right-4 tap-target" style={{ background: 'var(--surface)' }}>
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 mb-3 flex-wrap pr-12">
            <span className="badge" style={{ background: dc.bg, color: dc.text, border: `1px solid ${dc.border}`, fontSize: '11px' }}>
              {DIET_LABELS[meal.diet_type]?.label}
            </span>
            <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)', fontSize: '11px' }}>
              {CAT_ICONS[meal.category]} {meal.category}
            </span>
            {sourceBadge && (
              <span className="badge flex items-center gap-1" style={{ background: sourceBadge.bg, color: sourceBadge.text, fontSize: '11px' }}>
                {sourceBadge.icon} {sourceBadge.label}
              </span>
            )}
          </div>

          <h2 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(24px, 4vw, 32px)', color: 'var(--text)', letterSpacing: '-0.03em' }}>
            {meal.item_name}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-7">

          {/* Ingredients */}
          <div>
            <p className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: '14px', color: 'var(--text)' }}>
              🛒 Ingredients
              <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>({ingredients.length})</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <span key={i} className="px-3 py-2 rounded-xl capitalize"
                  style={{ fontSize: '13.5px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Detail notes */}
          {meal.detail_notes && (
            <div>
              <p className="font-semibold mb-2.5" style={{ fontSize: '14px', color: 'var(--text)' }}>📝 Notes</p>
              <p style={{ fontSize: '14.5px', color: 'var(--text-2)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {meal.detail_notes}
              </p>
            </div>
          )}

          {/* Recipe links */}
          {(meal.video_url || meal.written_url) && (
            <div>
              <p className="font-semibold mb-3" style={{ fontSize: '14px', color: 'var(--text)' }}>📖 Full Recipe</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {meal.video_url && videoMeta && (
                  <a href={meal.video_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl transition-all duration-150 hover:opacity-90 active:scale-95 tap-target"
                    style={{ padding: '15px 20px', background: videoMeta.color, color: '#fff', fontSize: '15px', fontWeight: 700, boxShadow: `0 6px 20px ${videoMeta.color}40` }}>
                    {videoMeta.icon} {videoMeta.label} <span style={{ opacity: 0.75, fontWeight: 500 }}>· {videoMeta.platform}</span>
                  </a>
                )}
                {meal.written_url && (
                  <a href={meal.written_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl transition-all duration-150 hover:opacity-80 active:scale-95 tap-target"
                    style={{ padding: '15px 20px', background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text)', fontSize: '15px', fontWeight: 700 }}>
                    <FileText size={16} /> Read Recipe
                  </a>
                )}
              </div>
            </div>
          )}

          {!meal.video_url && !meal.written_url && !meal.detail_notes && (
            <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: '13.5px', color: 'var(--text-3)' }}>
                No recipe link or notes saved yet. Tap Edit to add one.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 p-6 sm:p-8 pt-0">
          <button onClick={() => onEdit(meal)} className="btn-secondary btn flex-1 tap-target">
            <Edit2 size={16} /> Edit
          </button>
          <button onClick={() => onDelete(meal)} className="btn-danger btn flex-1 tap-target">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RecipesPage() {
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('')
  const [dietFilter,   setDietFilter]   = useState([])
  const [showForm,     setShowForm]     = useState(false)
  const [editMeal,     setEditMeal]     = useState(null)
  const [viewMeal,     setViewMeal]     = useState(null)   // recipe detail modal target
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
    setForm({
      item_name:    meal.item_name,
      category:     meal.category,
      ingredients:  meal.ingredients,
      diet_type:    meal.diet_type,
      video_url:    meal.video_url || '',
      written_url:  meal.written_url || '',
      detail_notes: meal.detail_notes || '',
    })
    setEditMeal(meal)
    setViewMeal(null)
    setShowForm(true)
  }
  function closeForm()     { setShowForm(false); setEditMeal(null); setForm(EMPTY) }
  function setField(k, v)  { setForm(p => ({ ...p, [k]:v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.item_name.trim() || !form.ingredients.trim()) { toast.error('Name and ingredients required'); return }
    setSubmitting(true)
    const payload = {
      item_name:    form.item_name.trim(),
      category:     form.category,
      ingredients:  form.ingredients.trim(),
      diet_type:    form.diet_type,
      video_url:    form.video_url.trim() || null,
      written_url:  form.written_url.trim() || null,
      detail_notes: form.detail_notes.trim() || null,
    }
    if (!editMeal) payload.source = 'manual'
    editMeal ? await updateMeal(editMeal.id, payload) : await addMeal(payload)
    setSubmitting(false); closeForm()
  }

  async function handleDelete(target) {
    const t = target || deleteTarget
    if (!t) return
    await deleteMeal(t.id)
    setDeleteTarget(null)
    setViewMeal(null)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); setImportErrors([])
    const { valid, errors } = await parseMealsFromFile(file)
    if (errors.length) setImportErrors(errors)
    if (valid.length)  await bulkAddMeals(valid.map(m => ({ ...m, source: 'import' })))
    setImporting(false); fileRef.current.value = ''
  }

  const grouped = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: meals.filter(m => m.category === cat) }), {})
  const showCats = catFilter ? [catFilter] : CATEGORIES

  return (
    <div className="page-container" style={{ animation:'fadeIn 0.35s ease' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
        <div>
          <span className="page-eyebrow">Recipe Library</span>
          <h1 className="section-title">My Recipes</h1>
          <p className="mt-1.5" style={{ color:'var(--text-3)', fontSize:'15.5px' }}>{meals.length} meals in your library</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary btn tap-target">
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import
          </button>

          <div className="relative" ref={exportRef}>
            <button onClick={() => setShowExport(v => !v)} className="btn-secondary btn tap-target">
              <Download size={16} /> Export
              <ChevronDown size={13} className={`transition-transform duration-200 ${showExport ? 'rotate-180' : ''}`} />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden z-20"
                style={{ background:'var(--surface)', border:'1.5px solid var(--border)', boxShadow:'0 16px 48px rgba(0,0,0,0.15)', animation:'scaleIn 0.15s ease' }}>
                <button onClick={() => { exportMealsAsJSON(meals); setShowExport(false) }}
                  className="w-full text-left px-4 py-3.5 transition-colors hover:bg-[var(--surface-2)] tap-target"
                  style={{ fontSize:'14px', color:'var(--text)' }}>
                  📄 Export as JSON
                </button>
                <button onClick={() => { exportMealsAsCSV(meals); setShowExport(false) }}
                  className="w-full text-left px-4 py-3.5 transition-colors hover:bg-[var(--surface-2)] tap-target"
                  style={{ fontSize:'14px', color:'var(--text)', borderTop:'1px solid var(--border)' }}>
                  📊 Export as CSV
                </button>
              </div>
            )}
          </div>

          <button onClick={openAdd} className="btn-primary btn tap-target">
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
          <button onClick={() => setImportErrors([])} style={{ color:'var(--text-3)' }} className="tap-target"><X size={15} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8" style={{ animation:'slideUp 0.4s ease 0.05s both' }}>
        <div className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft:'46px' }} placeholder="Search your recipes…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" style={{ color:'var(--text)' }}
          value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {DIET_OPTIONS.map(d => {
            const active = dietFilter.includes(d)
            const dc = DIET_COLORS[d]
            return (
              <button key={d}
                onClick={() => setDietFilter(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}
                className="px-4 py-2.5 rounded-full font-semibold transition-all duration-200 active:scale-95 tap-target"
                style={{ fontSize:'13.5px', border:`2px solid ${active ? dc.border : 'var(--border)'}`, background: active ? dc.bg : 'transparent', color: active ? dc.text : 'var(--text-3)' }}>
                {DIET_LABELS[d]?.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Meals grid — full-width responsive */}
      {loading ? (
        <div className="recipe-grid">
          {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ height:'168px', borderRadius:'18px', animationDelay:`${i*60}ms` }} />)}
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
        <div className="space-y-12">
          {showCats.map(category => {
            const catMeals = grouped[category]
            if (!catMeals?.length) return null
            return (
              <section key={category} style={{ animation:'slideUp 0.4s ease both' }}>
                <div className="flex items-center gap-3 mb-5">
                  <span style={{ fontSize:'24px' }}>{CAT_ICONS[category]}</span>
                  <h2 className="font-display font-semibold" style={{ fontSize:'24px', color:'var(--text)', letterSpacing:'-0.03em' }}>
                    {category}
                  </h2>
                  <span className="font-medium px-2.5 py-1 rounded-full"
                    style={{ fontSize:'12.5px', background:'var(--surface-2)', color:'var(--text-3)', border:'1px solid var(--border)' }}>
                    {catMeals.length}
                  </span>
                </div>

                <div className="recipe-grid">
                  {catMeals.map(meal => {
                    const dc = DIET_COLORS[meal.diet_type] || DIET_COLORS.veg
                    const hasVideo = !!meal.video_url
                    const hasWritten = !!meal.written_url
                    const sourceBadge = SOURCE_BADGES[meal.source]

                    return (
                      <button key={meal.id} onClick={() => setViewMeal(meal)}
                        className="card-hover p-5 group flex flex-col text-left w-full"
                        style={{ animation:'scaleIn 0.2s ease both', minHeight: '168px' }}>

                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <h3 className="font-semibold leading-snug" style={{ fontSize:'16.5px', color:'var(--text)', letterSpacing:'-0.02em' }}>
                            {meal.item_name}
                          </h3>
                          <span className="badge shrink-0" style={{ background:dc.bg, color:dc.text, border:`1px solid ${dc.border}` }}>
                            {DIET_LABELS[meal.diet_type]?.label}
                          </span>
                        </div>

                        {/* Ingredients */}
                        <p className="leading-relaxed flex-1 mb-3" style={{ fontSize:'13px', color:'var(--text-3)', lineHeight:'1.6' }}>
                          {meal.ingredients?.split(',').slice(0, 5).map(i => i.trim()).join(' · ')}
                          {meal.ingredients?.split(',').length > 5 ? ' …' : ''}
                        </p>

                        {/* Bottom row: link indicators + source badge */}
                        <div className="flex items-center gap-2 flex-wrap pt-3" style={{ borderTop:'1px solid var(--border)' }}>
                          {hasVideo && (
                            <span className="flex items-center gap-1" style={{ fontSize:'11.5px', color: getVideoMeta(meal.video_url)?.color, fontWeight:600 }}>
                              <Play size={12} /> Video
                            </span>
                          )}
                          {hasWritten && (
                            <span className="flex items-center gap-1" style={{ fontSize:'11.5px', color:'var(--text-3)', fontWeight:600 }}>
                              <FileText size={12} /> Recipe
                            </span>
                          )}
                          {sourceBadge && (
                            <span className="flex items-center gap-1 ml-auto" style={{ fontSize:'10.5px', color:sourceBadge.text, fontWeight:700 }}>
                              {sourceBadge.icon} {sourceBadge.label}
                            </span>
                          )}
                          {!hasVideo && !hasWritten && !sourceBadge && (
                            <span style={{ fontSize:'11.5px', color:'var(--text-3)', opacity: 0.6 }}>Tap to view →</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {viewMeal && (
        <RecipeDetailModal
          meal={viewMeal}
          onClose={() => setViewMeal(null)}
          onEdit={openEdit}
          onDelete={(m) => setDeleteTarget(m)}
        />
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-backdrop" style={{ animation:'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="modal-panel" style={{ maxWidth: '600px' }}>
            <div className="flex items-center justify-between p-6 sm:p-7 pb-0">
              <h3 className="font-display font-semibold" style={{ fontSize:'23px', color:'var(--text)', letterSpacing:'-0.03em' }}>
                {editMeal ? '✏️ Edit meal' : '✨ Add new meal'}
              </h3>
              <button onClick={closeForm} className="btn-ghost btn-icon tap-target"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
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

              {/* Two distinct link fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label flex items-center gap-1.5"><Play size={11} /> Video link</label>
                  <input className="input" value={form.video_url}
                    onChange={e => setField('video_url', e.target.value)}
                    placeholder="YouTube, Instagram, TikTok…" />
                </div>
                <div>
                  <label className="input-label flex items-center gap-1.5"><FileText size={11} /> Written recipe link</label>
                  <input className="input" value={form.written_url}
                    onChange={e => setField('written_url', e.target.value)}
                    placeholder="Blog post, recipe site…" />
                </div>
              </div>

              <div>
                <label className="input-label">Notes (optional)</label>
                <textarea className="input resize-none" rows={2} value={form.detail_notes}
                  onChange={e => setField('detail_notes', e.target.value)}
                  placeholder="Cooking tips, substitutions, anything else…" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary btn flex-1 tap-target">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary btn flex-1 tap-target">
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
        <div className="modal-backdrop" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="modal-panel" style={{ maxWidth: '420px', padding: '32px', textAlign: 'center' }}>
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
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary btn flex-1 tap-target">Keep it</button>
              <button onClick={() => handleDelete()} className="btn-danger btn flex-1 tap-target">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
