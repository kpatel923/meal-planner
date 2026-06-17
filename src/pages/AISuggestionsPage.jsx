import { useState } from 'react'
import { useMeals } from '../hooks/useMeals'
import { getMealSuggestions } from '../lib/aiFeatures'
import { Sparkles, Loader2, Plus, RefreshCw, ChefHat, X } from 'lucide-react'
import toast from 'react-hot-toast'

const DIET_LABELS = { veg: 'Veg', vegan: 'Vegan', nonveg: 'Non-Veg' }
const DIET_COLORS = {
  veg:    { bg: 'rgba(31,158,98,0.1)',  text: '#1F9E62', border: 'rgba(31,158,98,0.25)' },
  vegan:  { bg: 'rgba(11,96,59,0.12)', text: '#3AB87D', border: 'rgba(58,184,125,0.25)' },
  nonveg: { bg: 'rgba(212,80,42,0.1)', text: '#D4502A', border: 'rgba(212,80,42,0.25)' },
}
const CAT_ICONS = { Breakfast: '🍳', Lunch: '🥗', Dinner: '🍝', Snack: '🍎' }

export default function AISuggestionsPage() {
  const { meals, addMeal } = useMeals()
  const [ingredients,  setIngredients]  = useState('')
  const [category,     setCategory]     = useState('any')
  const [loading,      setLoading]      = useState(false)
  const [suggestions,  setSuggestions]  = useState([])
  const [adding,       setAdding]       = useState({})
  const [added,        setAdded]        = useState({})

  async function handleSuggest() {
    if (!ingredients.trim()) { toast.error('Enter some ingredients first'); return }
    setLoading(true)
    setSuggestions([])
    try {
      const results = await getMealSuggestions(
        ingredients,
        meals.map(m => m.item_name),
        category
      )
      if (!results.length) toast.error('No suggestions returned — try different ingredients')
      setSuggestions(results)
    } catch (e) {
      toast.error(e.message || 'AI suggestion failed — try again', { duration: 6000 })
    }
    setLoading(false)
  }

  async function handleAddMeal(suggestion) {
    setAdding(p => ({ ...p, [suggestion.name]: true }))
    const { error } = await addMeal({
      item_name:   suggestion.name,
      category:    suggestion.category || 'Dinner',
      ingredients: suggestion.ingredients,
      diet_type:   suggestion.diet_type || 'veg',
      notes:       null,
    })
    if (!error) {
      setAdded(p => ({ ...p, [suggestion.name]: true }))
      toast.success(`${suggestion.name} added to your library!`)
    }
    setAdding(p => ({ ...p, [suggestion.name]: false }))
  }

  const QUICK_PROMPTS = [
    'chicken, rice, broccoli, garlic',
    'eggs, avocado, spinach, tomato',
    'oats, banana, peanut butter, honey',
    'chickpeas, onion, tomato, spices',
    'salmon, lemon, asparagus, olive oil',
  ]

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease', maxWidth: '800px' }}>

      {/* Header */}
      <div className="mb-8">
        <span className="page-eyebrow">AI Chef</span>
        <h1 className="section-title">Meal Suggestions</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', marginTop: '8px' }}>
          Tell me what's in your fridge and I'll suggest meals you can make right now.
        </p>
      </div>

      {/* Input card */}
      <div className="card p-6 mb-6" style={{ animation: 'slideUp 0.4s ease 0.05s both' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(145deg,#27B872,#0B4529)', boxShadow: '0 4px 16px rgba(31,158,98,0.35)' }}>
            <ChefHat size={20} className="text-white" />
          </div>
          <div>
            <p className="font-semibold" style={{ fontSize: '16px', color: 'var(--text)' }}>What do you have?</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>List your ingredients separated by commas</p>
          </div>
        </div>

        <textarea
          className="input resize-none mb-4"
          rows={3}
          placeholder="e.g. chicken breast, rice, garlic, onion, bell pepper, soy sauce…"
          value={ingredients}
          onChange={e => setIngredients(e.target.value)}
        />

        {/* Quick prompts */}
        <div className="mb-4">
          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Quick tries
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => setIngredients(p)}
                className="px-3 py-1.5 rounded-full text-sm transition-all duration-150 hover:scale-[1.02] active:scale-95"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '12px' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select className="input" style={{ width: 'auto', fontSize: '14px' }}
            value={category} onChange={e => setCategory(e.target.value)}>
            <option value="any">Any meal type</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
          </select>

          <button onClick={handleSuggest} disabled={loading || !ingredients.trim()}
            className="btn-primary btn flex-1" style={{ minWidth: '160px' }}>
            {loading
              ? <><Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> Thinking…</>
              : <><Sparkles size={16} /> Get Suggestions</>}
          </button>

          {suggestions.length > 0 && (
            <button onClick={() => { setSuggestions([]); setAdded({}) }} className="btn-ghost btn btn-icon">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_,i) => (
            <div key={i} className="skeleton rounded-2xl" style={{ height: '96px', animationDelay: `${i*80}ms` }} />
          ))}
        </div>
      )}

      {/* Suggestions */}
      {!loading && suggestions.length > 0 && (
        <div style={{ animation: 'slideUp 0.4s ease' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold" style={{ fontSize: '16px', color: 'var(--text)' }}>
              {suggestions.length} meal ideas for you
            </p>
            <button onClick={handleSuggest} className="btn-ghost btn-sm btn gap-1.5">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div className="space-y-3">
            {suggestions.map((s, i) => {
              const dc       = DIET_COLORS[s.diet_type] || DIET_COLORS.veg
              const isAdded  = added[s.name]
              const isAdding = adding[s.name]

              return (
                <div key={i} className="card p-5 flex items-start gap-4"
                  style={{ animation: `slideUp 0.4s ease ${i * 60}ms both`, borderColor: isAdded ? 'rgba(31,158,98,0.3)' : 'var(--border)', background: isAdded ? 'rgba(31,158,98,0.03)' : 'var(--surface)' }}>

                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
                    style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                    {CAT_ICONS[s.category] || '🍽'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
                      <h3 className="font-display font-semibold" style={{ fontSize: '17px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                        {s.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <span className="badge" style={{ fontSize: '10px', background: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}>
                          {DIET_LABELS[s.diet_type] || s.diet_type}
                        </span>
                        {s.category && s.category !== 'any' && (
                          <span className="badge" style={{ fontSize: '10px', background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                            {CAT_ICONS[s.category]} {s.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: '1.5' }}>
                      {s.ingredients}
                    </p>
                  </div>

                  <button onClick={() => !isAdded && handleAddMeal(s)}
                    disabled={isAdding || isAdded}
                    className="btn shrink-0"
                    style={{
                      fontSize: '13px', padding: '8px 16px', borderRadius: '10px',
                      background: isAdded ? 'rgba(31,158,98,0.1)' : 'var(--brand)',
                      color: isAdded ? 'var(--brand)' : '#fff',
                      border: isAdded ? '1.5px solid rgba(31,158,98,0.3)' : 'none',
                      fontWeight: 600,
                    }}>
                    {isAdding
                      ? <Loader2 size={14} className="animate-[spin_1s_linear_infinite]" />
                      : isAdded ? '✓ Added' : <><Plus size={14} /> Add</>}
                  </button>
                </div>
              )
            })}
          </div>

          <p className="text-center mt-6" style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            Added meals go straight to your Recipe Library and will appear in future generated plans.
          </p>
        </div>
      )}

      {/* Empty suggestions state */}
      {!loading && !suggestions.length && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 text-4xl"
            style={{ background: 'linear-gradient(135deg,rgba(31,158,98,0.1),rgba(31,158,98,0.04))', border: '1.5px solid rgba(31,158,98,0.15)', animation: 'float 3s ease-in-out infinite' }}>
            🧑‍🍳
          </div>
          <p className="font-display font-semibold mb-2" style={{ fontSize: '20px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Ready to suggest
          </p>
          <p style={{ color: 'var(--text-3)', fontSize: '15px', maxWidth: '300px' }}>
            Enter your ingredients above and hit <strong style={{ color: 'var(--text)' }}>Get Suggestions</strong> — I'll find meals you can make right now.
          </p>
        </div>
      )}
    </div>
  )
}
