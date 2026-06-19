import { useState } from 'react'
import { useMeals } from '../hooks/useMeals'
import { usePlanStore } from '../hooks/usePlanStore'
import { useAuth } from '../hooks/useAuth'
import { getMealSuggestions } from '../lib/aiFeatures'
import {
  Sparkles, Loader2, Plus, RefreshCw, ChefHat,
  X, Edit2, Check, BookOpen, Globe, Layers,
  Play, FileText, Users, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

const DIET_LABELS = { veg: 'Veg', vegan: 'Vegan', nonveg: 'Non-Veg' }
const DIET_COLORS = {
  veg:    { bg:'rgba(31,158,98,0.1)',  text:'#1F9E62', border:'rgba(31,158,98,0.25)' },
  vegan:  { bg:'rgba(11,96,59,0.12)', text:'#3AB87D', border:'rgba(58,184,125,0.25)' },
  nonveg: { bg:'rgba(212,80,42,0.1)', text:'#D4502A', border:'rgba(212,80,42,0.25)' },
}
const CAT_ICONS = { Breakfast:'🍳', Lunch:'🥗', Dinner:'🍝', Snack:'🍎' }

const SOURCE_OPTIONS = [
  { key:'library', label:'My Recipes',  icon:<BookOpen size={14} />,  desc:'Find meals I can already make' },
  { key:'both',    label:'Both',         icon:<Layers size={14} />,    desc:'My recipes + new ideas' },
  { key:'web',     label:'New Ideas',    icon:<Globe size={14} />,     desc:'Discover new recipes' },
]

// ── Review modal before adding to library ────────────────────────────
function ReviewModal({ suggestion, onClose, onConfirm }) {
  const [form, setForm] = useState({
    item_name:    suggestion.name,
    category:     suggestion.category || 'Dinner',
    diet_type:    suggestion.diet_type || 'veg',
    ingredients:  suggestion.ingredients,
    video_url:    '',
    written_url:  '',
    detail_notes: suggestion.description || '',
  })
  const [saving, setSaving] = useState(false)

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleConfirm() {
    if (!form.item_name.trim() || !form.ingredients.trim()) {
      toast.error('Name and ingredients required')
      return
    }
    setSaving(true)
    await onConfirm(form)
    setSaving(false)
    onClose()
  }

  const CATEGORIES = ['Breakfast','Lunch','Dinner','Snack']
  const DIET_OPTIONS = ['veg','vegan','nonveg']

  return (
    <div className="modal-backdrop" style={{ animation:'fadeIn 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth:'560px' }}>

        {/* Header */}
        <div className="flex items-start justify-between p-6 sm:p-7 pb-0">
          <div>
            <p style={{ fontSize:'12px', color:'var(--brand)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }}>
              ✨ AI Suggestion
            </p>
            <h3 className="font-display font-bold" style={{ fontSize:'22px', color:'var(--text)', letterSpacing:'-0.03em' }}>
              Review before adding
            </h3>
            <p style={{ fontSize:'13px', color:'var(--text-3)', marginTop:'4px' }}>
              Edit anything you'd like to change — then tap Add to Library.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon tap-target"><X size={19} /></button>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-7 space-y-4">
          <div>
            <label className="input-label">Meal name</label>
            <input className="input" value={form.item_name}
              onChange={e => setField('item_name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Category</label>
              <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Diet type</label>
              <select className="input" value={form.diet_type} onChange={e => setField('diet_type', e.target.value)}>
                {DIET_OPTIONS.map(d => <option key={d} value={d}>{DIET_LABELS[d]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Ingredients</label>
            <textarea className="input resize-none" rows={2}
              value={form.ingredients} onChange={e => setField('ingredients', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label flex items-center gap-1"><Play size={11} /> Video link (optional)</label>
              <input className="input" value={form.video_url}
                onChange={e => setField('video_url', e.target.value)}
                placeholder="YouTube, Instagram…" />
            </div>
            <div>
              <label className="input-label flex items-center gap-1"><FileText size={11} /> Written recipe (optional)</label>
              <input className="input" value={form.written_url}
                onChange={e => setField('written_url', e.target.value)}
                placeholder="Blog, recipe site…" />
            </div>
          </div>

          <div>
            <label className="input-label">Notes</label>
            <textarea className="input resize-none" rows={2}
              value={form.detail_notes} onChange={e => setField('detail_notes', e.target.value)}
              placeholder="Any cooking tips or extra notes…" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary btn flex-1 tap-target">Cancel</button>
            <button onClick={handleConfirm} disabled={saving} className="btn-primary btn flex-1 tap-target">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add to Library
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function AISuggestionsPage() {
  const { profile } = useAuth()
  const { servings } = usePlanStore()
  const { meals, addMeal } = useMeals()

  const [ingredients,  setIngredients]  = useState('')
  const [category,     setCategory]     = useState('any')
  const [sourceMode,   setSourceMode]   = useState('both')
  const [loading,      setLoading]      = useState(false)
  const [suggestions,  setSuggestions]  = useState([])
  const [added,        setAdded]        = useState({})       // { name: true } once added
  const [reviewTarget, setReviewTarget] = useState(null)     // suggestion being reviewed

  // Use saved diet prefs from profile, fall back to all
  const dietPreferences = profile?.diet_prefs?.length
    ? profile.diet_prefs
    : ['veg','vegan','nonveg']

  async function handleSuggest() {
    if (!ingredients.trim()) { toast.error('Enter some ingredients first'); return }
    setLoading(true)
    setSuggestions([])

    try {
      const results = await getMealSuggestions({
        ingredientsOnHand: ingredients,
        existingMeals:     meals,
        category,
        sourceMode,
        dietPreferences,
        servings,
      })
      if (!results.length) {
        toast.error('No suggestions returned — try different ingredients or switch to New Ideas mode')
      }
      setSuggestions(results)
    } catch (e) {
      toast.error(e.message || 'AI suggestion failed — try again', { duration: 6000 })
    }
    setLoading(false)
  }

  async function handleAddConfirmed(formData) {
    const { error } = await addMeal({
      item_name:    formData.item_name.trim(),
      category:     formData.category,
      ingredients:  formData.ingredients.trim(),
      diet_type:    formData.diet_type,
      video_url:    formData.video_url?.trim() || null,
      written_url:  formData.written_url?.trim() || null,
      detail_notes: formData.detail_notes?.trim() || null,
      source:       'ai',
    })
    if (!error) {
      setAdded(p => ({ ...p, [formData.item_name]: true }))
      toast.success(`${formData.item_name} added to your library!`)
    }
  }

  const QUICK_PROMPTS = [
    'chicken, rice, broccoli, garlic',
    'eggs, avocado, spinach, tomato',
    'oats, banana, peanut butter, honey',
    'chickpeas, onion, tomato, spices',
    'salmon, lemon, asparagus, olive oil',
  ]

  return (
    <div className="page-container" style={{ animation:'fadeIn 0.35s ease', maxWidth:'860px' }}>

      {/* Header */}
      <div className="mb-8">
        <span className="page-eyebrow">AI Chef</span>
        <h1 className="section-title">Meal Suggestions</h1>
        <p style={{ color:'var(--text-3)', fontSize:'15.5px', marginTop:'8px' }}>
          Tell me what's in your fridge — I'll suggest meals you can make right now.
        </p>
      </div>

      {/* Context chips */}
      <div className="flex flex-wrap gap-2 mb-6" style={{ animation:'slideUp 0.4s ease 0.03s both' }}>
        <span className="badge flex items-center gap-1.5"
          style={{ background:'rgba(31,158,98,0.1)', color:'var(--brand)', border:'1px solid rgba(31,158,98,0.2)', padding:'6px 12px', fontSize:'12px' }}>
          <Users size={12} /> Cooking for {servings}
        </span>
        <span className="badge flex items-center gap-1.5"
          style={{ background:'var(--surface-2)', color:'var(--text-3)', border:'1px solid var(--border)', padding:'6px 12px', fontSize:'12px' }}>
          🥦 {dietPreferences.map(d => d === 'nonveg' ? 'Non-Veg' : d.charAt(0).toUpperCase() + d.slice(1)).join(' · ')}
        </span>
        <span className="badge flex items-center gap-1.5"
          style={{ background:'var(--surface-2)', color:'var(--text-3)', border:'1px solid var(--border)', padding:'6px 12px', fontSize:'12px' }}>
          <BookOpen size={12} /> {meals.length} recipes in library
        </span>
        <span style={{ fontSize:'12px', color:'var(--text-3)', display:'flex', alignItems:'center', gap:'4px' }}>
          <Info size={12} /> Change diet & serving size in Profile
        </span>
      </div>

      {/* Input card */}
      <div className="card p-6 sm:p-7 mb-6" style={{ animation:'slideUp 0.4s ease 0.05s both' }}>

        {/* Source mode */}
        <div className="mb-5">
          <p className="input-label mb-3">Where to search</p>
          <div className="segmented">
            {SOURCE_OPTIONS.map(({ key, label, icon }) => (
              <button key={key} onClick={() => setSourceMode(key)}
                className={`segmented-option ${sourceMode === key ? 'active' : ''}`}>
                <span className="flex items-center gap-1.5">{icon} {label}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize:'12px', color:'var(--text-3)', marginTop:'8px' }}>
            {SOURCE_OPTIONS.find(s => s.key === sourceMode)?.desc}
          </p>
        </div>

        {/* Ingredient input */}
        <div className="mb-4">
          <label className="input-label">What do you have?</label>
          <textarea className="input resize-none" rows={3}
            placeholder="e.g. chicken breast, rice, garlic, onion, bell pepper, soy sauce…"
            value={ingredients} onChange={e => setIngredients(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.metaKey && handleSuggest()} />
        </div>

        {/* Quick prompts */}
        <div className="mb-5">
          <p style={{ fontSize:'12px', color:'var(--text-3)', marginBottom:'8px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>
            Quick tries
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => setIngredients(p)}
                className="transition-all duration-150 hover:scale-[1.02] active:scale-95 tap-target"
                style={{ padding:'8px 14px', borderRadius:'10px', background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text-2)', fontSize:'13px' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Meal type + submit */}
        <div className="flex gap-3 flex-wrap">
          <select className="input" style={{ width:'auto', fontSize:'14.5px' }}
            value={category} onChange={e => setCategory(e.target.value)}>
            <option value="any">Any meal type</option>
            <option value="Breakfast">🍳 Breakfast</option>
            <option value="Lunch">🥗 Lunch</option>
            <option value="Dinner">🍝 Dinner</option>
            <option value="Snack">🍎 Snack</option>
          </select>

          <button onClick={handleSuggest} disabled={loading || !ingredients.trim()}
            className="btn-primary btn flex-1 tap-target" style={{ minWidth:'160px' }}>
            {loading
              ? <><Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> Thinking…</>
              : <><Sparkles size={16} /> Get Suggestions</>}
          </button>

          {suggestions.length > 0 && (
            <button onClick={() => { setSuggestions([]); setAdded({}) }} className="btn-ghost btn btn-icon tap-target">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Shimmer skeletons while loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_,i) => (
            <div key={i} className="skeleton rounded-2xl" style={{ height:'100px', animationDelay:`${i*80}ms` }} />
          ))}
        </div>
      )}

      {/* Suggestions */}
      {!loading && suggestions.length > 0 && (
        <div style={{ animation:'slideUp 0.4s ease' }}>
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold" style={{ fontSize:'17px', color:'var(--text)' }}>
              {suggestions.length} suggestions for you
            </p>
            <button onClick={handleSuggest} className="btn-ghost btn-sm btn gap-1.5 tap-target">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="space-y-3">
            {suggestions.map((s, i) => {
              const dc      = DIET_COLORS[s.diet_type] || DIET_COLORS.veg
              const isAdded = !!added[s.name]

              return (
                <div key={i} className="card p-5 sm:p-6"
                  style={{
                    animation: `slideUp 0.4s ease ${i*55}ms both`,
                    borderColor: isAdded ? 'rgba(31,158,98,0.3)' : s.fromLibrary ? 'rgba(31,158,98,0.15)' : 'var(--border)',
                    background: isAdded ? 'rgba(31,158,98,0.03)' : 'var(--surface)',
                  }}>
                  <div className="flex items-start gap-4">

                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
                      style={{ background:'var(--surface-2)', border:'1.5px solid var(--border)' }}>
                      {CAT_ICONS[s.category] || '🍽'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                        <h3 className="font-display font-bold" style={{ fontSize:'18px', color:'var(--text)', letterSpacing:'-0.02em' }}>
                          {s.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          {s.fromLibrary && (
                            <span className="badge flex items-center gap-1"
                              style={{ fontSize:'10px', background:'rgba(31,158,98,0.12)', color:'var(--brand)', border:'1px solid rgba(31,158,98,0.2)' }}>
                              <BookOpen size={9} /> In your library
                            </span>
                          )}
                          <span className="badge"
                            style={{ fontSize:'10px', background:dc.bg, color:dc.text, border:`1px solid ${dc.border}` }}>
                            {DIET_LABELS[s.diet_type]}
                          </span>
                          {s.category && s.category !== 'any' && (
                            <span className="badge"
                              style={{ fontSize:'10px', background:'var(--surface-2)', color:'var(--text-3)', border:'1px solid var(--border)' }}>
                              {CAT_ICONS[s.category]} {s.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ingredients */}
                      <p style={{ fontSize:'13.5px', color:'var(--text-3)', lineHeight:'1.55', marginBottom: s.description ? '6px' : '0' }}>
                        {s.ingredients}
                      </p>

                      {/* AI description */}
                      {s.description && (
                        <p style={{ fontSize:'13px', color:'var(--brand)', fontStyle:'italic', marginBottom:'0' }}>
                          "{s.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isAdded ? (
                    <div className="flex gap-2.5 mt-4 pt-4" style={{ borderTop:'1px solid var(--border)' }}>
                      {!s.fromLibrary && (
                        <button onClick={() => setReviewTarget(s)}
                          className="btn-primary btn flex-1 tap-target gap-2">
                          <Edit2 size={15} /> Review & Add
                        </button>
                      )}
                      {s.fromLibrary && (
                        <div className="flex items-center gap-2 text-sm" style={{ color:'var(--brand)' }}>
                          <Check size={15} /> Already in your library — ready to use in your plans
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop:'1px solid var(--border)', color:'var(--brand)', fontSize:'14px', fontWeight:600 }}>
                      <Check size={16} /> Added to your library
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-center mt-7" style={{ fontSize:'13px', color:'var(--text-3)' }}>
            Added meals appear in your Recipe Library and will show up in future generated plans.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !suggestions.length && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 text-5xl"
            style={{ background:'linear-gradient(135deg,rgba(31,158,98,0.1),rgba(31,158,98,0.04))', border:'1.5px solid rgba(31,158,98,0.15)', animation:'float 3s ease-in-out infinite' }}>
            🧑‍🍳
          </div>
          <p className="font-display font-semibold mb-2.5" style={{ fontSize:'22px', color:'var(--text)', letterSpacing:'-0.03em' }}>
            Ready when you are
          </p>
          <p style={{ color:'var(--text-3)', fontSize:'15px', maxWidth:'320px', lineHeight:'1.7' }}>
            Enter your ingredients, pick a search mode, and hit <strong style={{ color:'var(--text)' }}>Get Suggestions</strong>.
          </p>
        </div>
      )}

      {/* Review modal */}
      {reviewTarget && (
        <ReviewModal
          suggestion={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onConfirm={handleAddConfirmed}
        />
      )}
    </div>
  )
}
