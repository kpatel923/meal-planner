import { useState, useEffect, useRef } from 'react'
import { useMeals } from '../hooks/useMeals'
import { usePlanStore } from '../hooks/usePlanStore'
import { useAuth } from '../hooks/useAuth'
import { getMealSuggestions, analyzeMealPhoto, detectFridgeIngredients } from '../lib/aiFeatures'
import { matchMealsToIngredients } from '../lib/fridgeMatch'
import { fileToCompressedDataURL } from '../lib/imageUtils'
import PageHeader from '../components/planner/PageHeader'
import {
  Sparkles, Loader2, Plus, RefreshCw,
  X, Edit2, Check, BookOpen, Globe, Layers,
  Play, FileText, Users, Mic, Camera, Search, Clock, Flame, Image as ImageIcon, Refrigerator,
} from 'lucide-react'
import toast from 'react-hot-toast'

const DIET_LABELS = { veg: 'Veg', vegan: 'Vegan', nonveg: 'Non-Veg' }
const DIET_COLORS = {
  veg:    { bg:'var(--brand-light)',   text:'var(--brand-text)', border:'var(--brand)' },
  vegan:  { bg:'var(--success-light)', text:'var(--success)',    border:'var(--success)' },
  nonveg: { bg:'rgba(212,61,43,0.1)',  text:'var(--danger)',     border:'rgba(212,61,43,0.25)' },
}
const CAT_ICONS = { Breakfast:'🍳', Lunch:'🥗', Dinner:'🍝', Snack:'🍎' }

const SOURCE_OPTIONS = [
  { key:'library', label:'My Recipes', icon:<BookOpen size={14} />, desc:'Find meals I can already make' },
  { key:'both',    label:'Both',       icon:<Layers size={14} />,   desc:'My recipes + new ideas' },
  { key:'web',     label:'New Ideas',  icon:<Globe size={14} />,    desc:'Discover new recipes' },
]

// ── Review modal before adding to library ────────────────────────────
function ReviewModal({ suggestion, onClose, onConfirm }) {
  const [form, setForm] = useState({
    item_name:    suggestion.name,
    category:     suggestion.category || 'Dinner',
    diet_type:    suggestion.diet_type || 'veg',
    ingredients:  suggestion.ingredients,
    prep_time:    suggestion.prepTime != null ? String(suggestion.prepTime) : '',
    calories:     suggestion.calories != null ? String(suggestion.calories) : '',
    video_url:    '',
    written_url:  '',
    detail_notes: suggestion.description || '',
  })
  const [saving, setSaving] = useState(false)
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleConfirm() {
    if (!form.item_name.trim() || !form.ingredients.trim()) {
      toast.error('Name and ingredients required'); return
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
        <div className="flex items-start justify-between p-6 sm:p-7 pb-0">
          <div className="flex gap-4 min-w-0">
            {suggestion.photo && (
              <img src={suggestion.photo} alt={suggestion.name}
                className="shrink-0 rounded-2xl object-cover"
                style={{ width: 64, height: 64, border: '1px solid var(--border)' }} />
            )}
            <div className="min-w-0">
              <p style={{ fontSize:11, color:'var(--brand)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
                {suggestion.photo ? '📸 From your photo' : '✨ AI Suggestion'}
              </p>
              <h3 className="font-display font-semibold" style={{ fontSize:21, color:'var(--text)', letterSpacing:'-0.03em' }}>
                Review before adding
              </h3>
              <p style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>
                Edit anything you'd like — then tap Add to Library.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon tap-target shrink-0"><X size={19} /></button>
        </div>

        {/* Find-recipe-online quick links (shown for photo analysis) */}
        {suggestion.searchQuery && (
          <div className="px-6 sm:px-7 pt-4">
            <div className="rounded-2xl p-3.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="input-label flex items-center gap-1.5" style={{ marginBottom: 8 }}>
                <Search size={11} /> Find the full recipe
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(suggestion.searchQuery + ' recipe')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl tap-target transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 12.5 }}>
                  <Play size={13} /> Video on YouTube
                </a>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(suggestion.searchQuery + ' recipe')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl tap-target transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 12.5 }}>
                  <FileText size={13} /> Written recipe
                </a>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                Open one, then paste the link below so it's saved with your recipe.
              </p>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-7 space-y-4">
          <div>
            <label className="input-label">Meal name</label>
            <input className="input" value={form.item_name} onChange={e => setField('item_name', e.target.value)} />
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
            <textarea className="input resize-none" rows={2} value={form.ingredients} onChange={e => setField('ingredients', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label flex items-center gap-1"><Clock size={11} /> Time (min)</label>
              <input className="input" type="number" min="0" inputMode="numeric"
                value={form.prep_time} onChange={e => setField('prep_time', e.target.value)} placeholder="e.g. 25" />
            </div>
            <div>
              <label className="input-label flex items-center gap-1"><Flame size={11} /> Calories / serving</label>
              <input className="input" type="number" min="0" inputMode="numeric"
                value={form.calories} onChange={e => setField('calories', e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label flex items-center gap-1"><Play size={11} /> Video link (optional)</label>
              <input className="input" value={form.video_url} onChange={e => setField('video_url', e.target.value)} placeholder="YouTube, Instagram…" />
            </div>
            <div>
              <label className="input-label flex items-center gap-1"><FileText size={11} /> Written recipe (optional)</label>
              <input className="input" value={form.written_url} onChange={e => setField('written_url', e.target.value)} placeholder="Blog, recipe site…" />
            </div>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.detail_notes} onChange={e => setField('detail_notes', e.target.value)} placeholder="Any cooking tips or extra notes…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary btn flex-1 tap-target">Cancel</button>
            <button onClick={handleConfirm} disabled={saving} className="btn-primary btn flex-1 tap-target">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add to Library
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
  const [added,        setAdded]        = useState({})
  const [reviewTarget, setReviewTarget] = useState(null)
  const [listening,    setListening]    = useState(false)
  const [analyzing,    setAnalyzing]    = useState(false)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [detectingFridge, setDetectingFridge] = useState(false)
  const [fridgeMenuOpen,  setFridgeMenuOpen]  = useState(false)
  const [fridgeIngredients, setFridgeIngredients] = useState(null) // null = no scan yet; [] = scanned
  const [fridgeInput, setFridgeInput] = useState('')
  const [fridgeMatches, setFridgeMatches] = useState(null) // library matches [{meal,have,missing,ratio}]
  const cameraInputRef  = useRef(null)
  const libraryInputRef = useRef(null)
  const fridgeCameraRef  = useRef(null)
  const fridgeLibraryRef = useRef(null)
  const recognitionRef = useRef(null)
  const voiceSupported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    if (!voiceSupported) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setIngredients(prev => prev ? `${prev}, ${transcript}` : transcript)
    }
    recognition.onerror = () => { setListening(false); toast.error('Could not hear you — try again') }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [voiceSupported])

  function toggleListening() {
    if (!recognitionRef.current) return
    if (listening) { recognitionRef.current.stop(); setListening(false) }
    else {
      try { recognitionRef.current.start(); setListening(true) } catch { /* already started */ }
    }
  }

  const dietPreferences = profile?.diet_prefs?.length ? profile.diet_prefs : ['veg','vegan','nonveg']

  async function handleSuggest() {
    if (!ingredients.trim()) { toast.error('Enter some ingredients first'); return }
    setLoading(true)
    setSuggestions([])
    try {
      const results = await getMealSuggestions({
        ingredientsOnHand: ingredients, existingMeals: meals, category, sourceMode, dietPreferences, servings,
      })
      if (!results.length) toast.error('No suggestions — try different ingredients or New Ideas mode')
      setSuggestions(results)
    } catch (e) {
      toast.error(e.message || 'AI suggestion failed — try again', { duration: 6000 })
    }
    setLoading(false)
  }

  async function handleAddConfirmed(formData) {
    const toInt = v => {
      const n = parseInt(v, 10)
      return Number.isFinite(n) && n >= 0 ? n : null
    }
    const { error } = await addMeal({
      item_name: formData.item_name.trim(), category: formData.category,
      ingredients: formData.ingredients.trim(), diet_type: formData.diet_type,
      prep_time: toInt(formData.prep_time), calories: toInt(formData.calories),
      video_url: formData.video_url?.trim() || null, written_url: formData.written_url?.trim() || null,
      detail_notes: formData.detail_notes?.trim() || null, source: 'ai',
    })
    if (!error) {
      setAdded(p => ({ ...p, [formData.item_name]: true }))
      toast.success(`${formData.item_name} added to your library!`)
    }
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0]
    // reset the input so the same file can be re-picked later
    e.target.value = ''
    if (!file) return
    setAnalyzing(true)
    const toastId = toast.loading('Analyzing your photo…')
    try {
      const dataUrl = await fileToCompressedDataURL(file)
      const result = await analyzeMealPhoto(dataUrl)
      toast.success('Got it! Review the details', { id: toastId })
      // Route into the existing review modal, carrying the photo + search query.
      setReviewTarget({ ...result, photo: dataUrl })
    } catch (err) {
      toast.error(err.message || 'Could not analyze that photo', { id: toastId, duration: 5000 })
    }
    setAnalyzing(false)
  }

  // ── Cook from fridge ──────────────────────────────────────────────
  async function handleFridgePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setDetectingFridge(true)
    setFridgeMatches(null)
    setSuggestions([])
    const toastId = toast.loading('Scanning your ingredients…')
    try {
      const dataUrl = await fileToCompressedDataURL(file)
      const detected = await detectFridgeIngredients(dataUrl)
      setFridgeIngredients(detected)
      toast.success(`Found ${detected.length} ingredient${detected.length === 1 ? '' : 's'} — review below`, { id: toastId })
    } catch (err) {
      toast.error(err.message || 'Could not read that photo', { id: toastId, duration: 5000 })
    }
    setDetectingFridge(false)
  }

  function removeFridgeIngredient(item) {
    setFridgeIngredients(prev => (prev || []).filter(i => i !== item))
  }
  function addFridgeIngredient() {
    const v = fridgeInput.trim().toLowerCase()
    if (!v) return
    setFridgeIngredients(prev => prev?.includes(v) ? prev : [...(prev || []), v])
    setFridgeInput('')
  }
  function resetFridge() {
    setFridgeIngredients(null); setFridgeMatches(null); setFridgeInput(''); setSuggestions([])
  }

  // Turn the confirmed fridge ingredients into meal suggestions, respecting the
  // source toggle: library = fuzzy local match; web/both = AI suggestions.
  async function handleFridgeFindMeals() {
    const owned = fridgeIngredients || []
    if (!owned.length) { toast.error('Add at least one ingredient'); return }
    setLoading(true)
    setFridgeMatches(null)
    setSuggestions([])
    try {
      if (sourceMode === 'library') {
        const matches = matchMealsToIngredients(owned, meals, { dietTypes: dietPreferences })
        if (!matches.length) {
          toast.error('No close matches in your library — try "Both" or "New ideas" mode')
        }
        setFridgeMatches(matches.slice(0, 12))
      } else {
        const results = await getMealSuggestions({
          ingredientsOnHand: owned.join(', '), existingMeals: meals,
          category, sourceMode, dietPreferences, servings,
        })
        if (!results.length) toast.error('No suggestions — try different ingredients')
        setSuggestions(results)
      }
    } catch (e) {
      toast.error(e.message || 'Could not find meals — try again', { duration: 6000 })
    }
    setLoading(false)
  }

  const QUICK_PROMPTS = [
    'chicken, rice, broccoli, garlic',
    'eggs, avocado, spinach, tomato',
    'oats, banana, peanut butter, honey',
    'chickpeas, onion, tomato, spices',
    'salmon, lemon, asparagus, olive oil',
  ]

  return (
    <div className="page-container" style={{ animation:'fadeIn 0.35s ease', maxWidth:'820px' }}>

      <PageHeader eyebrow="AI Chef" title="Meal Suggestions"
        subtitle="Tell me what's in your fridge — I'll suggest meals you can make right now." />

      {/* Context chips */}
      <div className="flex flex-wrap gap-2 mb-5 mt-1" style={{ animation:'slideUp 0.4s ease 0.03s both' }}>
        <span className="badge flex items-center gap-1.5" style={{ background:'var(--brand-light)', color:'var(--brand-text)', border:'1px solid var(--brand)', padding:'5px 11px', fontSize:11.5 }}>
          <Users size={12} /> Cooking for {servings}
        </span>
        <span className="badge flex items-center gap-1.5" style={{ background:'var(--surface-2)', color:'var(--text-3)', border:'1px solid var(--border)', padding:'5px 11px', fontSize:11.5 }}>
          🥦 {dietPreferences.map(d => d === 'nonveg' ? 'Non-Veg' : d.charAt(0).toUpperCase() + d.slice(1)).join(' · ')}
        </span>
        <span className="badge flex items-center gap-1.5" style={{ background:'var(--surface-2)', color:'var(--text-3)', border:'1px solid var(--border)', padding:'5px 11px', fontSize:11.5 }}>
          <BookOpen size={12} /> {meals.length} recipes
        </span>
      </div>

      {/* Photo → recipe card */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
        onChange={handlePhotoSelected} style={{ display: 'none' }} />
      <input ref={libraryInputRef} type="file" accept="image/*"
        onChange={handlePhotoSelected} style={{ display: 'none' }} />
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { if (!analyzing) setPhotoMenuOpen(v => !v) }}
          disabled={analyzing}
          className="w-full text-left rounded-2xl mb-4 transition-all tap-target"
          style={{
            padding: '16px 18px',
            background: 'linear-gradient(135deg, var(--brand-light), var(--surface-2))',
            border: '1px solid var(--brand)',
            animation: 'slideUp 0.4s ease 0.04s both',
            opacity: analyzing ? 0.7 : 1,
          }}>
          <div className="flex items-center gap-3.5">
            <div className="shrink-0 flex items-center justify-center rounded-2xl"
              style={{ width: 48, height: 48, background: 'var(--brand)' }}>
              {analyzing
                ? <Loader2 size={22} className="animate-[spin_1s_linear_infinite]" style={{ color: '#fff' }} />
                : <Camera size={22} style={{ color: '#fff' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold" style={{ fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {analyzing ? 'Analyzing your photo…' : 'Snap or upload a meal'}
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.45 }}>
                {analyzing
                  ? 'Identifying the dish, ingredients & nutrition'
                  : 'AI identifies the dish, ingredients, and finds the recipe'}
              </p>
            </div>
            {!analyzing && (
              <span className="badge shrink-0" style={{ fontSize: 10, background: 'var(--brand)', color: '#fff', border: 'none' }}>NEW</span>
            )}
          </div>
        </button>

        {/* Source chooser */}
        {photoMenuOpen && !analyzing && (
          <>
            <div onClick={() => setPhotoMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div className="rounded-2xl"
              style={{
                position: 'absolute', top: 'calc(100% - 8px)', left: 0, right: 0, zIndex: 41,
                background: 'var(--surface)', border: '1px solid var(--border)',
                boxShadow: '0 16px 40px rgba(22,22,20,0.18)', overflow: 'hidden',
                animation: 'slideDown 0.18s ease both',
              }}>
              <button
                onClick={() => { setPhotoMenuOpen(false); cameraInputRef.current?.click() }}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap-target transition-all text-left"
                style={{ color: 'var(--text)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Camera size={18} style={{ color: 'var(--brand)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Take a photo</span>
              </button>
              <button
                onClick={() => { setPhotoMenuOpen(false); libraryInputRef.current?.click() }}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap-target transition-all text-left"
                style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <ImageIcon size={18} style={{ color: 'var(--brand)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Choose from library</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Cook from my fridge card */}
      <input ref={fridgeCameraRef} type="file" accept="image/*" capture="environment"
        onChange={handleFridgePhoto} style={{ display: 'none' }} />
      <input ref={fridgeLibraryRef} type="file" accept="image/*"
        onChange={handleFridgePhoto} style={{ display: 'none' }} />
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { if (!detectingFridge) setFridgeMenuOpen(v => !v) }}
          disabled={detectingFridge}
          className="w-full text-left rounded-2xl mb-4 transition-all tap-target"
          style={{
            padding: '16px 18px',
            background: 'linear-gradient(135deg, var(--accent-light), var(--surface-2))',
            border: '1px solid var(--accent)',
            animation: 'slideUp 0.4s ease 0.045s both',
            opacity: detectingFridge ? 0.7 : 1,
          }}>
          <div className="flex items-center gap-3.5">
            <div className="shrink-0 flex items-center justify-center rounded-2xl"
              style={{ width: 48, height: 48, background: 'var(--accent)' }}>
              {detectingFridge
                ? <Loader2 size={22} className="animate-[spin_1s_linear_infinite]" style={{ color: '#fff' }} />
                : <Refrigerator size={22} style={{ color: '#fff' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold" style={{ fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {detectingFridge ? 'Scanning your ingredients…' : 'Cook from my fridge'}
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.45 }}>
                {detectingFridge
                  ? 'Spotting what you have on hand'
                  : 'Snap your fridge — AI finds meals from what you have'}
              </p>
            </div>
            {!detectingFridge && (
              <span className="badge shrink-0" style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', border: 'none' }}>NEW</span>
            )}
          </div>
        </button>

        {fridgeMenuOpen && !detectingFridge && (
          <>
            <div onClick={() => setFridgeMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div className="rounded-2xl"
              style={{
                position: 'absolute', top: 'calc(100% - 8px)', left: 0, right: 0, zIndex: 41,
                background: 'var(--surface)', border: '1px solid var(--border)',
                boxShadow: '0 16px 40px rgba(22,22,20,0.18)', overflow: 'hidden',
                animation: 'slideDown 0.18s ease both',
              }}>
              <button onClick={() => { setFridgeMenuOpen(false); fridgeCameraRef.current?.click() }}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap-target transition-all text-left"
                style={{ color: 'var(--text)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Camera size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Take a photo</span>
              </button>
              <button onClick={() => { setFridgeMenuOpen(false); fridgeLibraryRef.current?.click() }}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap-target transition-all text-left"
                style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <ImageIcon size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Choose from library</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirm detected ingredients — vision can misread, so let the user edit */}
      {fridgeIngredients && (
        <div className="card p-5 mb-4" style={{ animation: 'slideUp 0.3s ease both', border: '1px solid var(--accent)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="font-display font-semibold" style={{ fontSize: 15.5, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {fridgeIngredients.length ? 'Here\u2019s what I spotted' : 'Add your ingredients'}
            </p>
            <button onClick={resetFridge} className="tap-target" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Clear
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.45 }}>
            Tap to remove anything wrong, or add what I missed — then find meals.
          </p>

          {fridgeIngredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {fridgeIngredients.map(item => (
                <span key={item} className="flex items-center gap-1.5 capitalize"
                  style={{ fontSize: 13, padding: '6px 10px', borderRadius: 99, background: 'var(--accent-light)', border: '1px solid var(--accent)', color: 'var(--accent-text)' }}>
                  {item}
                  <button onClick={() => removeFridgeIngredient(item)} aria-label={`Remove ${item}`} style={{ display: 'flex', color: 'var(--accent-text)' }}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <input className="input flex-1" placeholder="Add an ingredient…"
              value={fridgeInput} onChange={e => setFridgeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFridgeIngredient())} />
            <button onClick={addFridgeIngredient} disabled={!fridgeInput.trim()} className="btn-secondary btn gap-1.5 tap-target shrink-0">
              <Plus size={15} /> Add
            </button>
          </div>

          <button onClick={handleFridgeFindMeals} disabled={loading || !fridgeIngredients.length}
            className="btn-primary btn w-full tap-target gap-2">
            {loading
              ? <><Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> Finding meals…</>
              : <><Sparkles size={16} /> Find meals I can make</>}
          </button>
        </div>
      )}

      {/* Library matches from fridge — fuzzy, with "you'll still need" */}
      {fridgeMatches && fridgeMatches.length > 0 && (
        <div className="mb-6" style={{ animation: 'slideUp 0.4s ease both' }}>
          <div className="flex items-center gap-2 mb-3">
            <Refrigerator size={16} style={{ color: 'var(--accent)' }} />
            <p className="font-semibold" style={{ fontSize: 16, color: 'var(--text)' }}>
              {fridgeMatches.length} meal{fridgeMatches.length === 1 ? '' : 's'} from your library
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {fridgeMatches.map(({ meal, missing, ratio }) => (
              <div key={meal.id} className="card p-4" style={{ border: missing.length === 0 ? '1px solid var(--success)' : '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold" style={{ fontSize: 15, color: 'var(--text)' }}>{meal.item_name}</p>
                      <span className="badge" style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--text-2)' }}>{meal.category}</span>
                      {missing.length === 0 && (
                        <span className="badge" style={{ fontSize: 10, background: 'var(--success-light)', color: 'var(--success)', border: 'none' }}>
                          Ready to cook
                        </span>
                      )}
                    </div>
                    {missing.length > 0 ? (
                      <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 5, lineHeight: 1.45 }}>
                        You'll still need: <span style={{ color: 'var(--accent-text)', fontWeight: 500 }} className="capitalize">{missing.join(', ')}</span>
                      </p>
                    ) : (
                      <p style={{ fontSize: 12.5, color: 'var(--success)', marginTop: 5 }}>You have everything for this!</p>
                    )}
                  </div>
                  <div className="shrink-0 text-center" style={{ minWidth: 44 }}>
                    <div className="nums font-bold" style={{ fontSize: 17, color: ratio === 1 ? 'var(--success)' : 'var(--accent)' }}>{Math.round(ratio * 100)}%</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-3)' }}>have</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, textAlign: 'center' }}>
            These are already in your library — head to the planner to add them to your week.
          </p>
        </div>
      )}

      {/* divider */}
      <div className="flex items-center gap-3 mb-4" style={{ animation: 'slideUp 0.4s ease 0.045s both' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>or type ingredients</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Input card — streamlined: ingredients first, source + type inline */}
      <div className="card p-5 sm:p-6 mb-6" style={{ animation:'slideUp 0.4s ease 0.05s both' }}>

        {/* Ingredient input — the primary action, up top */}
        <div className="flex items-center justify-between mb-2">
          <label className="input-label" style={{ marginBottom: 0 }}>What do you have?</label>
          {voiceSupported && (
            <button onClick={toggleListening} type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-all tap-target"
              style={{
                fontSize:12,
                background: listening ? 'rgba(212,61,43,0.12)' : 'var(--brand-light)',
                color: listening ? 'var(--danger)' : 'var(--brand-text)',
                border: `1px solid ${listening ? 'rgba(212,61,43,0.25)' : 'var(--brand)'}`,
              }}>
              <Mic size={13} className={listening ? 'animate-pulse' : ''} />
              {listening ? 'Listening…' : 'Speak'}
            </button>
          )}
        </div>
        <textarea className="input resize-none" rows={3}
          placeholder="e.g. chicken breast, rice, garlic, onion, bell pepper, soy sauce…"
          value={ingredients} onChange={e => setIngredients(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.metaKey && handleSuggest()} />

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => setIngredients(p)}
              className="transition-all tap-target active:scale-95"
              style={{ padding:'6px 12px', borderRadius:10, background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text-2)', fontSize:12.5 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              {p}
            </button>
          ))}
        </div>

        {/* Source mode + meal type + submit — all inline */}
        <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex-1">
            <p className="input-label mb-2">Where to search</p>
            <div className="segmented">
              {SOURCE_OPTIONS.map(({ key, label, icon }) => (
                <button key={key} onClick={() => setSourceMode(key)}
                  className={`segmented-option ${sourceMode === key ? 'active' : ''}`}>
                  <span className="flex items-center gap-1.5">{icon} {label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sm:w-40">
            <p className="input-label mb-2">Meal type</p>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)} style={{ fontSize: 14 }}>
              <option value="any">Any type</option>
              <option value="Breakfast">🍳 Breakfast</option>
              <option value="Lunch">🥗 Lunch</option>
              <option value="Dinner">🍝 Dinner</option>
              <option value="Snack">🍎 Snack</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2.5 mt-4">
          <button onClick={handleSuggest} disabled={loading || !ingredients.trim()}
            className="btn-primary btn flex-1 btn-lg tap-target gap-2">
            {loading ? <><Loader2 size={17} className="animate-[spin_1s_linear_infinite]" /> Thinking…</> : <><Sparkles size={17} /> Get Suggestions</>}
          </button>
          {suggestions.length > 0 && (
            <button onClick={() => { setSuggestions([]); setAdded({}) }} className="btn-ghost btn btn-icon tap-target"><X size={16} /></button>
          )}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_,i) => (
            <div key={i} className="skeleton rounded-2xl" style={{ height:96, animationDelay:`${i*80}ms` }} />
          ))}
        </div>
      )}

      {/* Suggestions */}
      {!loading && suggestions.length > 0 && (
        <div style={{ animation:'slideUp 0.4s ease' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold" style={{ fontSize:16, color:'var(--text)' }}>{suggestions.length} suggestions for you</p>
            <button onClick={handleSuggest} className="btn-ghost btn-sm btn gap-1.5 tap-target"><RefreshCw size={14} /> Refresh</button>
          </div>

          <div className="space-y-3">
            {suggestions.map((s, i) => {
              const dc = DIET_COLORS[s.diet_type] || DIET_COLORS.veg
              const isAdded = !!added[s.name]
              return (
                <div key={i} className="card p-5"
                  style={{
                    animation: `slideUp 0.4s ease ${i*55}ms both`,
                    borderColor: isAdded ? 'var(--brand)' : s.fromLibrary ? 'var(--brand-light)' : 'var(--border)',
                    background: isAdded ? 'var(--brand-light)' : 'var(--surface)',
                  }}>
                  <div className="flex items-start gap-3.5">
                    <div className="flex items-center justify-center shrink-0 rounded-2xl"
                      style={{ width: 48, height: 48, background:'var(--surface-2)', border:'1px solid var(--border)', fontSize: 22 }}>
                      {CAT_ICONS[s.category] || '🍽'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
                        <h3 className="font-display font-semibold" style={{ fontSize:16.5, color:'var(--text)', letterSpacing:'-0.02em' }}>{s.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          {s.fromLibrary && (
                            <span className="badge flex items-center gap-1" style={{ fontSize:10, background:'var(--brand-light)', color:'var(--brand-text)', border:'1px solid var(--brand)' }}>
                              <BookOpen size={9} /> In library
                            </span>
                          )}
                          <span className="badge" style={{ fontSize:10, background:dc.bg, color:dc.text, border:`1px solid ${dc.border}` }}>{DIET_LABELS[s.diet_type]}</span>
                          {s.category && s.category !== 'any' && (
                            <span className="badge" style={{ fontSize:10, background:'var(--surface-2)', color:'var(--text-3)', border:'1px solid var(--border)' }}>{CAT_ICONS[s.category]} {s.category}</span>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.55, marginBottom: s.description ? 6 : 0 }}>{s.ingredients}</p>
                      {s.description && (
                        <p style={{ fontSize:12.5, color:'var(--brand)', fontStyle:'italic' }}>"{s.description}"</p>
                      )}
                    </div>
                  </div>

                  {!isAdded ? (
                    (!s.fromLibrary) ? (
                      <div className="flex gap-2.5 mt-3.5 pt-3.5" style={{ borderTop:'1px solid var(--border)' }}>
                        <button onClick={() => setReviewTarget(s)} className="btn-primary btn btn-sm flex-1 tap-target gap-2">
                          <Edit2 size={14} /> Review & Add
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-3.5 pt-3.5" style={{ borderTop:'1px solid var(--border)', color:'var(--brand)', fontSize:13 }}>
                        <Check size={15} /> Already in your library — ready to use
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 mt-3.5 pt-3.5" style={{ borderTop:'1px solid var(--border)', color:'var(--brand)', fontSize:13.5, fontWeight:600 }}>
                      <Check size={16} /> Added to your library
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-center mt-6" style={{ fontSize:12.5, color:'var(--text-3)' }}>
            Added meals appear in your Recipe Library and show up in future generated plans.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !suggestions.length && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="flex items-center justify-center rounded-2xl mb-5"
            style={{ width: 72, height: 72, background:'var(--surface-2)', border:'1px solid var(--border)', fontSize: 36 }}>
            🧑‍🍳
          </div>
          <p className="font-display font-semibold mb-2" style={{ fontSize:18, color:'var(--text)', letterSpacing:'-0.02em' }}>Ready when you are</p>
          <p style={{ color:'var(--text-3)', fontSize:14, maxWidth:300, lineHeight:1.6 }}>
            Enter your ingredients, pick a search mode, and hit <strong style={{ color:'var(--text)' }}>Get Suggestions</strong>.
          </p>
        </div>
      )}

      {reviewTarget && (
        <ReviewModal suggestion={reviewTarget} onClose={() => setReviewTarget(null)} onConfirm={handleAddConfirmed} />
      )}
    </div>
  )
}
