import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMeals } from '../hooks/useMeals'
import { supabase } from '../lib/supabase'
import { Sparkles, Check, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Checks once per session for a pending AI-generated recipe suggestion (from
// the daily-suggestion cron) and, if one exists, pops up a small card the
// user can save straight into their library or dismiss. Mounted once in
// AppLayout so it's available no matter which page they land on.
export default function PendingSuggestion() {
  const { user } = useAuth()
  const { addMeal } = useMeals()
  const [suggestion, setSuggestion] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('ai_suggestions')
      .select('meal_json, created_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.meal_json) setSuggestion(data.meal_json)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user])

  async function dismiss() {
    setSuggestion(null)
    if (user) {
      try { await supabase.from('ai_suggestions').delete().eq('user_id', user.id) } catch {}
    }
  }

  async function handleSave() {
    if (!suggestion) return
    setBusy(true)
    const { error } = await addMeal({
      item_name: suggestion.item_name,
      category: suggestion.category,
      diet_type: suggestion.diet_type,
      ingredients: suggestion.ingredients,
      prep_time: suggestion.prep_time || null,
      calories: suggestion.calories || null,
      source: 'ai-suggested',
    })
    setBusy(false)
    if (!error) {
      toast.success(`${suggestion.item_name} added to your recipes!`)
      dismiss()
    }
  }

  if (!suggestion) return null

  return (
    <div className="app-modal app-modal-center modal-safe"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease', zIndex: 80 }}
      onClick={e => e.target === e.currentTarget && !busy && dismiss()}>
      <div className="app-modal-card" style={{ padding: 22 }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-light)' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-dark)' }} />
          </div>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>AI recipe idea</p>
            <h3 className="font-display font-bold" style={{ fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text)' }}>{suggestion.item_name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap my-3">
          <span className="badge" style={{ fontSize: 11, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{suggestion.category}</span>
          <span className="badge" style={{ fontSize: 11, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{suggestion.diet_type}</span>
          {suggestion.prep_time ? <span className="badge" style={{ fontSize: 11, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{suggestion.prep_time} min</span> : null}
          {suggestion.calories ? <span className="badge" style={{ fontSize: 11, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{suggestion.calories} cal</span> : null}
        </div>

        {suggestion.ingredients && (
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 18 }}>
            {suggestion.ingredients}
          </p>
        )}

        <div className="flex gap-2.5">
          <button onClick={dismiss} disabled={busy} className="btn-secondary btn flex-1 tap-target gap-1.5">
            <X size={15} /> Skip
          </button>
          <button onClick={handleSave} disabled={busy} className="btn-primary btn flex-1 tap-target gap-1.5">
            {busy ? <Loader2 size={15} className="animate-[spin_1s_linear_infinite]" /> : <><Check size={15} /> Save recipe</>}
          </button>
        </div>
      </div>
    </div>
  )
}
