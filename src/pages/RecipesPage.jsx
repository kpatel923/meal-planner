import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { parseMealsFromFile, exportMealsAsJSON, exportMealsAsCSV } from '../lib/importExport'
import { DIET_LABELS, CATEGORIES } from '../lib/mealLogic'
import { nutritionColor } from '../lib/nutrition'
import { getBudgetTag, BUDGET_TAG_STYLES, formatCost } from '../lib/budget'
import { getMealFacts, formatPrepTime } from '../lib/mealFacts'
import { SEED_RECIPES } from '../lib/seedRecipes'
import { parseRecipeFromURL, analyzeMealPhoto, generateRecipeFromName, searchRecipeImage } from '../lib/aiFeatures'
import { fileToCompressedDataURL } from '../lib/imageUtils'
import RecipeDetailModal, { DIET_COLORS, SOURCE_BADGES, CAT_ICONS, getVideoMeta } from '../components/RecipeDetailModal'
import {
  Plus, Search, Upload, Download,
  Loader2, X, BookOpen, AlertTriangle, ChevronDown,
  Play, Camera, FileText,
  Sparkles, Clock, ImagePlus, Wand2, Flame, Heart,
  DollarSign, Trash, List, LayoutGrid
} from 'lucide-react'
import toast from 'react-hot-toast'

const DIET_OPTIONS = ['veg','vegan','nonveg']
const EMPTY = { item_name:'', category:'Breakfast', ingredients:'', diet_type:'veg', prep_time:'', calories:'', video_url:'', written_url:'', detail_notes:'', photo_url:'' }

export default function RecipesPage() {
  const { user } = useAuth()
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('')
  const [dietFilter,   setDietFilter]   = useState([])
  const [favsOnly,     setFavsOnly]     = useState(false)
  const [viewMode,     setViewMode]     = useState('grid') // 'grid' | 'compact'
  const [seeding,      setSeeding]      = useState(false)
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)
  const [showForm,     setShowForm]     = useState(false)
  const [editMeal,     setEditMeal]     = useState(null)
  const [viewMeal,     setViewMeal]     = useState(null)   // recipe detail modal target
  const [form,         setForm]         = useState(EMPTY)
  const [generatingName, setGeneratingName] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [importing,    setImporting]    = useState(false)
  const [importErrors, setImportErrors] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showExport,   setShowExport]   = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [detectUrl,    setDetectUrl]    = useState('')
  const [detecting,    setDetecting]    = useState(false)
  const [showDetect,   setShowDetect]   = useState(false)
  const fileRef   = useRef(null)
  const photoRef  = useRef(null)
  const analyzePhotoRef = useRef(null)
  const exportRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { meals, loading, addMeal, updateMeal, deleteMeal, toggleFavorite, bulkAddMeals } = useMeals({
    search:     search || undefined,
    category:   catFilter || undefined,
    diet_types: dietFilter.length ? dietFilter : undefined,
  })

  async function handleAddStarters() {
    setSeeding(true)
    const payload = SEED_RECIPES.map(r => ({ ...r, source: 'manual' }))
    const { error } = await bulkAddMeals(payload)
    setSeeding(false)
    if (!error) toast.success(`Added ${SEED_RECIPES.length} starter recipes!`)
  }

  function openAdd()       { setForm(EMPTY); setEditMeal(null); setShowDetect(false); setDetectUrl(''); setShowForm(true) }
  function openEdit(meal)  {
    setForm({
      item_name:    meal.item_name,
      category:     meal.category,
      ingredients:  meal.ingredients,
      diet_type:    meal.diet_type,
      prep_time:    meal.prep_time != null ? String(meal.prep_time) : '',
      calories:     meal.calories != null ? String(meal.calories) : '',
      video_url:    meal.video_url || '',
      written_url:  meal.written_url || '',
      detail_notes: meal.detail_notes || '',
      photo_url:    meal.photo_url || '',
    })
    setEditMeal(meal)
    setViewMeal(null)
    setShowDetect(false)
    setDetectUrl('')
    setShowForm(true)
  }
  // When the editor was opened from another page (e.g. the planner's "create
  // recipe"), remember where to go back to so closing the editor returns there.
  const location = useLocation()
  const navigate = useNavigate()
  const returnToRef = useRef(null)
  function closeForm() {
    setShowForm(false); setEditMeal(null); setForm(EMPTY); setShowDetect(false); setDetectUrl('')
    if (returnToRef.current) {
      const dest = returnToRef.current
      returnToRef.current = null
      navigate(dest)
    }
  }
  function setField(k, v)  { setForm(p => ({ ...p, [k]:v })) }

  // If we arrived here from "Create recipe" in the planner swap, open the editor
  // for that freshly-created recipe so the user can fill in details right away.
  useEffect(() => {
    const editId = location.state?.editMealId
    if (editId && meals.length) {
      const target = meals.find(m => m.id === editId)
      if (target) {
        returnToRef.current = location.state?.returnTo || null
        openEdit(target)
        // Clear the navigation state so it doesn't re-open on back/refresh.
        window.history.replaceState({}, '')
      }
    }
  }, [location.state, meals])

  // Warn if the typed name closely matches an existing recipe (avoid duplicates).
  // Skips the check while editing an existing meal.
  const duplicateMatch = useMemo(() => {
    const name = form.item_name.trim().toLowerCase()
    if (!name || name.length < 3 || editMeal) return null
    return meals.find(m => m.item_name?.trim().toLowerCase() === name) || null
  }, [form.item_name, meals, editMeal])

  async function handleGenerateFromName() {
    const name = form.item_name.trim()
    if (!name) return
    setGeneratingName(true)
    const toastId = toast.loading('Generating recipe…')
    try {
      const r = await generateRecipeFromName(name)
      // Fetch a real food photo in parallel (best-effort; never blocks).
      const photoPromise = form.photo_url ? Promise.resolve(null) : searchRecipeImage(r.name || name)
      setForm(p => ({
        ...p,
        item_name:    r.name || p.item_name,
        category:     r.category || p.category,
        diet_type:    r.diet_type || p.diet_type,
        ingredients:  r.ingredients || p.ingredients,
        prep_time:    r.prep_time != null ? String(r.prep_time) : p.prep_time,
        detail_notes: r.description || p.detail_notes,
        // Media: reliable search links (only if user hasn't set their own).
        video_url:    p.video_url   || r.videoSearchUrl   || '',
        written_url:  p.written_url || r.writtenSearchUrl || '',
      }))
      const photo = await photoPromise
      if (photo) {
        setForm(p => ({ ...p, photo_url: p.photo_url || photo }))
        toast.success(`Filled in with a photo! (${r.confidence} confidence — review before saving)`, { id: toastId })
      } else {
        toast.success(`Filled in! (${r.confidence} confidence — review before saving)`, { id: toastId })
      }
    } catch (e) {
      toast.error(e.message || 'Could not generate recipe', { id: toastId, duration: 5000 })
    }
    setGeneratingName(false)
  }

  // ── Photo upload to Supabase Storage ─────────────────────────────
  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return }

    setUploadingPhoto(true)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('meal-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Photo upload failed — try again')
      setUploadingPhoto(false)
      return
    }

    const { data: urlData } = supabase.storage.from('meal-photos').getPublicUrl(path)
    setField('photo_url', urlData.publicUrl)
    setUploadingPhoto(false)
    toast.success('Photo uploaded!')
  }

  function removePhoto() { setField('photo_url', '') }

  // ── Auto-detect recipe from pasted URL ───────────────────────────
  async function handleDetectFromUrl() {
    if (!detectUrl.trim()) { toast.error('Paste a URL first'); return }
    setDetecting(true)
    try {
      const result = await parseRecipeFromURL(detectUrl.trim())
      if (!result.name) {
        toast.error('Could not detect details from that URL — try entering manually')
      } else {
        setForm(p => ({
          ...p,
          item_name:   result.name || p.item_name,
          category:    result.category || p.category,
          diet_type:   result.diet_type || p.diet_type,
          ingredients: result.ingredients || p.ingredients,
          video_url:   result.videoUrl || p.video_url,
          written_url: result.writtenUrl || p.written_url,
        }))
        toast.success(`Filled in! (${result.confidence} confidence — review before saving)`)
        setShowDetect(false)
      }
    } catch (e) {
      toast.error(e.message || 'Could not detect recipe from URL')
    }
    setDetecting(false)
  }

  // Auto-fill the form from a food photo using AI vision (same as the AI page).
  async function handleAnalyzePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAnalyzingPhoto(true)
    const toastId = toast.loading('Analyzing photo…')
    try {
      const dataUrl = await fileToCompressedDataURL(file)
      const result = await analyzeMealPhoto(dataUrl)
      setForm(p => ({
        ...p,
        item_name:   result.name || p.item_name,
        category:    result.category || p.category,
        diet_type:   result.diet_type || p.diet_type,
        ingredients: result.ingredients || p.ingredients,
        prep_time:   result.prepTime != null ? String(result.prepTime) : p.prep_time,
        calories:    result.calories != null ? String(result.calories) : p.calories,
        detail_notes: result.description || p.detail_notes,
      }))
      toast.success('Filled in from photo — review before saving', { id: toastId })
    } catch (err) {
      toast.error(err.message || 'Could not read that photo', { id: toastId, duration: 5000 })
    }
    setAnalyzingPhoto(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.item_name.trim() || !form.ingredients.trim()) { toast.error('Name and ingredients required'); return }
    setSubmitting(true)
    const toInt = v => {
      const n = parseInt(v, 10)
      return Number.isFinite(n) && n >= 0 ? n : null
    }
    const payload = {
      item_name:    form.item_name.trim(),
      category:     form.category,
      ingredients:  form.ingredients.trim(),
      diet_type:    form.diet_type,
      prep_time:    toInt(form.prep_time),
      calories:     toInt(form.calories),
      video_url:    form.video_url.trim() || null,
      written_url:  form.written_url.trim() || null,
      detail_notes: form.detail_notes.trim() || null,
      photo_url:    form.photo_url || null,
      needs_details: false,   // saving with details clears the draft flag
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

  const visibleMeals = favsOnly ? meals.filter(m => m.is_favorite) : meals
  const grouped = [...CATEGORIES, 'Dessert'].reduce((acc, cat) => ({ ...acc, [cat]: visibleMeals.filter(m => m.category === cat) }), {})
  const ALL_CATS = [...CATEGORIES, 'Dessert']
  const showCats = catFilter ? [catFilter] : ALL_CATS

  return (
    <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 pt-4 sm:pt-6" style={{ animation:'fadeIn 0.35s ease' }}>

      {/* Header — matches Today/Week/AI */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>Recipe Library</span>
          <h1 className="font-display font-bold" style={{ fontSize: 26, letterSpacing: '-0.03em', color: 'var(--text)', marginTop: 3 }}>My Recipes</h1>
          <p style={{ color:'var(--text-3)', fontSize:'13.5px', marginTop: 5 }}>{meals.length} meals in your library</p>
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
                style={{ background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 16px 48px rgba(0,0,0,0.15)', animation:'scaleIn 0.15s ease' }}>
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
          style={{ background:'rgba(212,61,43,0.08)', border:'1px solid rgba(212,61,43,0.2)', animation:'slideDown 0.3s ease' }}>
          <AlertTriangle size={17} style={{ color:'var(--danger)', marginTop:2, flexShrink:0 }} />
          <div className="flex-1">
            <p className="font-semibold mb-1" style={{ color:'var(--danger)', fontSize:'14px' }}>
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
          {[...CATEGORIES, 'Dessert'].map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {DIET_OPTIONS.map(d => {
            const active = dietFilter.includes(d)
            const dc = DIET_COLORS[d]
            return (
              <button key={d}
                onClick={() => setDietFilter(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}
                className="px-4 py-2.5 rounded-full font-semibold transition-all duration-200 active:scale-95 tap-target"
                style={{ fontSize:'13.5px', background: active ? dc.bg : 'var(--surface-2)', color: active ? dc.text : 'var(--text-2)' }}>
                {DIET_LABELS[d]?.label}
              </button>
            )
          })}
          <button onClick={() => setFavsOnly(v => !v)}
            className="px-4 py-2.5 rounded-full font-semibold transition-all duration-200 active:scale-95 tap-target flex items-center gap-1.5"
            style={{ fontSize:'13.5px', background: favsOnly ? 'var(--danger-light)' : 'var(--surface-2)', color: favsOnly ? 'var(--danger)' : 'var(--text-2)' }}>
            <Heart size={13} fill={favsOnly ? 'var(--danger)' : 'none'} /> Favorites
          </button>
          <button onClick={() => setViewMode(v => v === 'grid' ? 'compact' : 'grid')}
            aria-label={viewMode === 'grid' ? 'Switch to compact list' : 'Switch to grid'}
            className="rounded-full transition-all active:scale-95 tap-target flex items-center justify-center"
            style={{ width: 42, height: 42, background: 'var(--surface-2)', color: 'var(--text-2)' }}>
            {viewMode === 'grid' ? <List size={17} /> : <LayoutGrid size={17} />}
          </button>
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
            style={{ background:'var(--surface-2)', border:'1px solid var(--border)', fontSize:'36px' }}>
            <BookOpen size={32} style={{ color:'var(--text-3)' }} />
          </div>
          {(search || catFilter || dietFilter.length || favsOnly) ? (
            <>
              <p className="font-display font-semibold mb-2" style={{ fontSize:'22px', color:'var(--text)', letterSpacing:'-0.03em' }}>No meals found</p>
              <p style={{ color:'var(--text-3)', fontSize:'15px' }}>Try a different filter, or add a new meal above.</p>
            </>
          ) : (
            <>
              <p className="font-display font-semibold mb-2" style={{ fontSize:'22px', color:'var(--text)', letterSpacing:'-0.03em' }}>Your library is empty</p>
              <p style={{ color:'var(--text-3)', fontSize:'15px', maxWidth: 360, marginBottom: 20 }}>
                Add your own recipes, or start instantly with a handful of balanced everyday meals you can edit anytime.
              </p>
              <button onClick={handleAddStarters} disabled={seeding}
                className="btn-primary btn btn-lg tap-target gap-2">
                {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Add {SEED_RECIPES.length} starter recipes
              </button>
            </>
          )}
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

                <div className={viewMode === 'compact' ? 'flex flex-col gap-2' : 'recipe-grid'}>
                  {catMeals.map(meal => {
                    const dc = DIET_COLORS[meal.diet_type] || DIET_COLORS.veg
                    const hasVideo = !!meal.video_url
                    const hasWritten = !!meal.written_url
                    const sourceBadge = SOURCE_BADGES[meal.source]
                    const facts = getMealFacts(meal, 1)
                    const nutrition = facts.calories != null ? { calories: facts.calories } : null
                    const cost = facts.cost
                    const prepLabel = formatPrepTime(facts.prepTime)
                    const budgetTag = meal.budget_tag || (cost != null ? getBudgetTag(cost) : null)
                    const budgetStyle = budgetTag ? BUDGET_TAG_STYLES[budgetTag] : null

                    // ── Compact row ──
                    if (viewMode === 'compact') {
                      return (
                        <button key={meal.id} onClick={() => setViewMeal(meal)}
                          className="card flex items-center gap-3 text-left w-full" style={{ padding: '9px 12px' }}>
                          {meal.photo_url ? (
                            <div style={{ width: 44, height: 44, borderRadius: 11, overflow: 'hidden', flexShrink: 0 }}>
                              <img src={meal.photo_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--accent-light)', fontSize: 19 }}>
                              {CAT_ICONS[meal.category] || '🍽️'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold truncate" style={{ fontSize: 14.5, color: 'var(--text)' }}>{meal.item_name}</p>
                            <p className="truncate" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                              {[prepLabel, nutrition?.calories ? `${nutrition.calories} cal` : null].filter(Boolean).join(' · ') || meal.ingredients?.split(',').slice(0,3).join(', ')}
                            </p>
                          </div>
                          {meal.is_favorite && <Heart size={14} fill="var(--danger)" style={{ color: 'var(--danger)', flexShrink: 0 }} />}
                          <span className="badge shrink-0" style={{ background: dc.bg, color: dc.text }}>{DIET_LABELS[meal.diet_type]?.label}</span>
                        </button>
                      )
                    }

                    return (
                      <button key={meal.id} onClick={() => setViewMeal(meal)}
                        className="card-hover group flex flex-col text-left w-full overflow-hidden"
                        style={{ animation:'scaleIn 0.2s ease both', minHeight: '168px', padding: 0 }}>

                        {/* Photo thumbnail */}
                        {meal.photo_url && (
                          <div style={{ height:'120px', overflow:'hidden' }}>
                            <img src={meal.photo_url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          </div>
                        )}

                        <div className="p-5 flex flex-col flex-1">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <h3 className="font-semibold leading-snug" style={{ fontSize:'16.5px', color:'var(--text)', letterSpacing:'-0.02em' }}>
                              {meal.item_name}
                            </h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(meal.id, meal.is_favorite) }}
                                aria-label={meal.is_favorite ? 'Unfavorite' : 'Favorite'}
                                className="flex items-center justify-center rounded-lg tap-target transition-all"
                                style={{ width: 30, height: 30, color: meal.is_favorite ? 'var(--danger)' : 'var(--text-3)' }}>
                                <Heart size={16} fill={meal.is_favorite ? 'var(--danger)' : 'none'} />
                              </button>
                              <span className="badge" style={{ background:dc.bg, color:dc.text }}>
                                {DIET_LABELS[meal.diet_type]?.label}
                              </span>
                            </div>
                          </div>

                          {/* Ingredients */}
                          <p className="leading-relaxed flex-1 mb-3" style={{ fontSize:'13px', color:'var(--text-3)', lineHeight:'1.6' }}>
                            {meal.ingredients?.split(',').slice(0, 5).map(i => i.trim()).join(' · ')}
                            {meal.ingredients?.split(',').length > 5 ? ' …' : ''}
                          </p>

                          {/* Nutrition + time + cost + budget chips */}
                          {(nutrition?.calories || prepLabel || cost != null || budgetStyle) && (
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              {prepLabel && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ fontSize:'11px', fontWeight:600, color:'var(--text-2)', background:'var(--surface-2)' }}>
                                  <Clock size={11} /> {prepLabel}
                                </span>
                              )}
                              {nutrition?.calories && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ fontSize:'11px', fontWeight:600, color: nutritionColor(nutrition.calories), background:'var(--surface-2)' }}>
                                  <Flame size={11} /> {nutrition.calories} cal
                                </span>
                              )}
                              {cost != null && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ fontSize:'11px', fontWeight:600, color:'var(--text-2)', background:'var(--surface-2)' }}>
                                  <DollarSign size={11} /> {formatCost(cost)}
                                </span>
                              )}
                              {budgetStyle && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ fontSize:'11px', fontWeight:600, color:budgetStyle.color, background:budgetStyle.bg }}>
                                  {budgetStyle.emoji} {budgetStyle.label}
                                </span>
                              )}
                            </div>
                          )}

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
          meal={meals.find(m => m.id === viewMeal.id) || viewMeal}
          onClose={() => setViewMeal(null)}
          onEdit={openEdit}
          onDelete={(m) => setDeleteTarget(m)}
          onToggleFavorite={(m) => toggleFavorite(m.id, m.is_favorite)}
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

            {/* Auto-fill from URL or photo */}
            {!editMeal && (
              <div className="px-6 sm:px-7 pt-5">
                {!showDetect ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button onClick={() => setShowDetect(true)} type="button"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all tap-target"
                      style={{ fontSize:'13.5px', background:'rgba(139,95,191,0.08)', border:'1px dashed rgba(139,95,191,0.3)', color:'#8B5FBF' }}>
                      <Wand2 size={15} /> Auto-fill from URL
                    </button>
                    <button onClick={() => analyzePhotoRef.current?.click()} type="button" disabled={analyzingPhoto}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all tap-target"
                      style={{ fontSize:'13.5px', background:'var(--brand-light)', border:'1px dashed var(--brand)', color:'var(--brand-text)' }}>
                      {analyzingPhoto ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                      {analyzingPhoto ? 'Analyzing…' : 'Auto-fill from photo'}
                    </button>
                    <input ref={analyzePhotoRef} type="file" accept="image/*" className="hidden" onChange={handleAnalyzePhoto} />
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl" style={{ background:'rgba(139,95,191,0.06)', border:'1px solid rgba(139,95,191,0.2)' }}>
                    <p className="font-semibold mb-2 flex items-center gap-1.5" style={{ fontSize:'13px', color:'#8B5FBF' }}>
                      <Wand2 size={13} /> Paste a recipe URL to auto-fill
                    </p>
                    <div className="flex gap-2">
                      <input className="input" style={{ fontSize:'13.5px' }} value={detectUrl}
                        onChange={e => setDetectUrl(e.target.value)}
                        placeholder="https://youtube.com/... or any recipe link"
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleDetectFromUrl())} />
                      <button onClick={handleDetectFromUrl} disabled={detecting} type="button"
                        className="btn tap-target shrink-0" style={{ background:'#8B5FBF', color:'#fff', fontSize:'13px', padding:'10px 16px' }}>
                        {detecting ? <Loader2 size={14} className="animate-spin" /> : 'Detect'}
                      </button>
                    </div>
                    <p style={{ fontSize:'11px', color:'var(--text-3)', marginTop:'8px' }}>
                      AI infers details from the URL — always review before saving.
                    </p>
                    <button onClick={() => setShowDetect(false)} type="button"
                      style={{ fontSize:'12px', color:'var(--text-3)', marginTop:'8px' }}>← Back</button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">

              {/* Photo upload */}
              <div>
                <label className="input-label">Photo (optional)</label>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                {form.photo_url ? (
                  <div className="relative rounded-2xl overflow-hidden" style={{ height:'160px' }}>
                    <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={removePhoto}
                      className="absolute top-2 right-2 p-2 rounded-xl tap-target"
                      style={{ background:'rgba(0,0,0,0.6)', color:'#fff' }}>
                      <Trash size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                    className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl transition-all tap-target"
                    style={{ height:'120px', background:'var(--surface-2)', border:'1px dashed var(--border)', color:'var(--text-3)' }}>
                    {uploadingPhoto
                      ? <Loader2 size={22} className="animate-spin" />
                      : <><ImagePlus size={22} /> <span style={{ fontSize:'13px' }}>Add a photo</span></>}
                  </button>
                )}
              </div>

              <div>
                <label className="input-label">Meal name *</label>
                <div className="flex gap-2">
                  <input className="input flex-1" value={form.item_name}
                    onChange={e => setField('item_name', e.target.value)}
                    placeholder="e.g. Thai Green Curry" required autoFocus />
                  <button type="button" onClick={handleGenerateFromName}
                    disabled={generatingName || !form.item_name.trim()}
                    className="btn-secondary btn gap-1.5 shrink-0" title="Fill in the details with AI">
                    {generatingName
                      ? <Loader2 size={15} className="animate-[spin_1s_linear_infinite]" />
                      : <Sparkles size={15} />}
                    <span className="hidden sm:inline">Autofill</span>
                  </button>
                </div>
                {duplicateMatch && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--accent-text)', flex: 1 }}>
                      You already have "{duplicateMatch.item_name}" — add anyway, or open the existing one?
                    </span>
                    <button type="button" onClick={() => openEdit(duplicateMatch)}
                      style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text)', textDecoration: 'underline' }}>
                      Open
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Category *</label>
                  <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                    {[...CATEGORIES, 'Dessert'].map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
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

              {/* Time & calories — optional; blank falls back to estimates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label flex items-center gap-1.5"><Clock size={11} /> Total time (min)</label>
                  <input className="input" type="number" min="0" inputMode="numeric"
                    value={form.prep_time} onChange={e => setField('prep_time', e.target.value)}
                    placeholder="e.g. 25" />
                </div>
                <div>
                  <label className="input-label flex items-center gap-1.5"><Flame size={11} /> Calories / serving</label>
                  <input className="input" type="number" min="0" inputMode="numeric"
                    value={form.calories} onChange={e => setField('calories', e.target.value)}
                    placeholder="leave blank to estimate" />
                </div>
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
              style={{ background:'rgba(212,61,43,0.08)', border:'1px solid rgba(212,61,43,0.2)', fontSize:'24px' }}>
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
