import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useMeals } from '../hooks/useMeals'
import { usePlans } from '../hooks/usePlans'
import { usePlanStore } from '../hooks/usePlanStore'
import { exportMealsAsJSON, exportMealsAsCSV } from '../lib/importExport'
import { getMostUsedMeals } from '../lib/avoidRepeats'
import { weeklyBudgetTotal, budgetToTier, formatCost, BUDGET_TAG_STYLES } from '../lib/budget'
import { User, Mail, Shield, Download, LogOut, Save, Loader2, Pencil, Check, X, Sun, Moon, BookOpen, Bookmark, Calendar, Users, TrendingUp, DollarSign, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const DIET_OPTIONS = [
  { key: 'veg',    label: 'Vegetarian', emoji: '🥦' },
  { key: 'vegan',  label: 'Vegan',      emoji: '🌱' },
  { key: 'nonveg', label: 'Non-Veg',    emoji: '🍗' },
]

export default function ProfilePage() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { isDark, toggle } = useTheme()
  const { meals }  = useMeals()
  const { plans }  = usePlans()
  const { servings: liveServings, setServings: setLiveServings, weeklyPlan } = usePlanStore()
  const navigate   = useNavigate()

  const [editingName,  setEditingName]  = useState(false)
  const [nameValue,    setNameValue]    = useState(profile?.username || '')
  const [savingName,   setSavingName]   = useState(false)
  const [savingPrefs,  setSavingPrefs]  = useState(false)
  const [savingServ,   setSavingServ]   = useState(false)
  const [savingBudget, setSavingBudget] = useState(false)
  const [dietPrefs,    setDietPrefs]    = useState(profile?.diet_prefs || ['veg','vegan','nonveg'])
  const [servings,     setServingsLocal] = useState(profile?.default_servings || liveServings || 2)
  const [budgetMode,   setBudgetModeLocal] = useState(profile?.budget_mode || false)
  const [weeklyBudget, setWeeklyBudgetLocal] = useState(profile?.weekly_budget || 75)
  const [mostUsed,     setMostUsed]     = useState([])
  const [loadingUsage, setLoadingUsage] = useState(true)

  const initials = (profile?.username || user?.email || 'U').charAt(0).toUpperCase()
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  useEffect(() => {
    if (!user?.id) return
    getMostUsedMeals(user.id, 10).then(data => {
      setMostUsed(data)
      setLoadingUsage(false)
    })
  }, [user?.id])

  async function handleSaveName() {
    if (!nameValue.trim()) return
    setSavingName(true)
    const { error } = await updateProfile({ username: nameValue.trim() })
    if (error) toast.error('Could not update name')
    setSavingName(false)
    setEditingName(false)
  }

  async function handleSavePrefs() {
    if (!dietPrefs.length) { toast.error('Select at least one preference'); return }
    setSavingPrefs(true)
    const { error } = await updateProfile({ diet_prefs: dietPrefs })
    if (error) toast.error('Could not save preferences')
    else toast.success('Preferences saved!')
    setSavingPrefs(false)
  }

  function adjustServings(n) {
    setServingsLocal(p => Math.min(20, Math.max(1, p + n)))
  }

  async function handleSaveServings() {
    setSavingServ(true)
    const { error } = await updateProfile({ default_servings: servings })
    if (error) {
      toast.error('Could not save household size')
    } else {
      setLiveServings(servings) // sync immediately into the active planner session
      toast.success('Household size saved!')
    }
    setSavingServ(false)
  }

  async function handleSaveBudget() {
    setSavingBudget(true)
    const { error } = await updateProfile({ budget_mode: budgetMode, weekly_budget: weeklyBudget })
    if (error) toast.error('Could not save budget settings')
    else toast.success('Budget settings saved!')
    setSavingBudget(false)
  }

  function toggleDiet(key) {
    setDietPrefs(p => p.includes(key) ? p.filter(d => d !== key) : [...p, key])
  }

  async function handleSignOut() { await signOut(); navigate('/auth') }

  // Budget comparison: what tier does this weekly budget land in, and what's the live plan costing?
  const suggestedTier = budgetToTier(weeklyBudget, servings)
  const tierStyle = suggestedTier ? BUDGET_TAG_STYLES[suggestedTier] : null
  const currentPlanCost = weeklyPlan ? weeklyBudgetTotal(weeklyPlan, servings) : null

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease', maxWidth: '680px' }}>
      <div className="mb-8">
        <span className="page-eyebrow">Account</span>
        <h1 className="section-title">Profile</h1>
      </div>

      {/* ── Identity card ─────────────────────────────── */}
      <div className="card p-6 sm:p-7 mb-5" style={{ animation: 'slideUp 0.4s ease 0.05s both' }}>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-18 h-18 rounded-2xl flex items-center justify-center text-white font-display font-bold shrink-0"
            style={{ width: '72px', height: '72px', fontSize: '28px', background: 'linear-gradient(135deg,#1F9E62,#0B4529)', boxShadow: '0 4px 20px rgba(31,158,98,0.35)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2" style={{ animation: 'slideDown 0.2s ease' }}>
                <input className="input flex-1" style={{ fontSize: '15px' }}
                  value={nameValue} onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus placeholder="Your name" />
                <button onClick={handleSaveName} disabled={savingName} className="btn-primary btn-sm btn p-2.5">
                  {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button onClick={() => setEditingName(false)} className="btn-ghost btn-sm btn p-2.5">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="font-display font-semibold" style={{ fontSize: '22px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  {profile?.username || 'Your Name'}
                </h2>
                <button onClick={() => { setNameValue(profile?.username || ''); setEditingName(true) }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: 'var(--text-3)' }}>
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="flex items-center gap-1.5 mt-1" style={{ fontSize: '14px', color: 'var(--text-3)' }}>
              <Mail size={13} /> {user?.email}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          {[
            { icon: BookOpen,  label: 'Recipes',      value: meals.length },
            { icon: Bookmark,  label: 'Saved Plans',  value: plans.length },
            { icon: Calendar,  label: 'Member since', value: joinDate },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl transition-colors hover:bg-[var(--surface-2)]">
              <Icon size={18} className="mx-auto mb-2" style={{ color: 'var(--brand)' }} />
              <p className="font-display font-bold" style={{ fontSize: '22px', color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Appearance ────────────────────────────────── */}
      <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
        <h3 className="font-semibold mb-4" style={{ fontSize: '16px', color: 'var(--text)' }}>Appearance</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(252,211,77,0.1)' : 'rgba(31,158,98,0.1)', border: '1.5px solid var(--border)' }}>
              {isDark ? <Moon size={20} style={{ color: '#FCD34D' }} /> : <Sun size={20} style={{ color: 'var(--brand)' }} />}
            </div>
            <div>
              <p className="font-semibold" style={{ fontSize: '15px', color: 'var(--text)' }}>
                {isDark ? 'Dark mode' : 'Light mode'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                {isDark ? 'Easy on the eyes at night' : 'Clean and bright'}
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <button onClick={toggle}
            className="relative rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ width: '52px', height: '28px', background: isDark ? 'var(--brand)' : 'var(--border)' }}>
            <div className="absolute top-1 rounded-full bg-white shadow-md transition-transform duration-300"
              style={{ width: '20px', height: '20px', left: '4px', transform: isDark ? 'translateX(24px)' : 'translateX(0)' }} />
          </button>
        </div>
      </div>

      {/* ── Diet preferences ──────────────────────────── */}
      <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.15s both' }}>
        <h3 className="font-semibold mb-1" style={{ fontSize: '16px', color: 'var(--text)' }}>Diet preferences</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
          These are your defaults when generating a new meal plan.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {DIET_OPTIONS.map(({ key, label, emoji }) => {
            const active = dietPrefs.includes(key)
            return (
              <button key={key} onClick={() => toggleDiet(key)}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 active:scale-95"
                style={{
                  borderColor: active ? 'var(--brand)' : 'var(--border)',
                  background: active ? 'rgba(31,158,98,0.08)' : 'var(--surface)',
                  color: active ? 'var(--brand)' : 'var(--text-3)',
                  transform: active ? 'scale(1.02)' : 'scale(1)',
                }}>
                <span style={{ fontSize: '26px' }}>{emoji}</span>
                <span className="font-medium" style={{ fontSize: '13px' }}>{label}</span>
                {active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand)' }} />}
              </button>
            )
          })}
        </div>
        <button onClick={handleSavePrefs} disabled={savingPrefs} className="btn-primary btn tap-target">
          {savingPrefs ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save preferences
        </button>
      </div>

      {/* ── Household size ───────────────────────────────── */}
      <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.17s both' }}>
        <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ fontSize: '16px', color: 'var(--text)' }}>
          <Users size={16} style={{ color: 'var(--brand)' }} /> Household size
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
          How many people you're usually cooking for — scales grocery quantities and portion sizes automatically.
        </p>
        <div className="flex items-center gap-4 mb-5">
          <div className="stepper">
            <button onClick={() => adjustServings(-1)} disabled={servings <= 1} className="stepper-btn" style={{ opacity: servings <= 1 ? 0.3 : 1 }}>−</button>
            <span className="stepper-value">{servings}</span>
            <button onClick={() => adjustServings(1)} disabled={servings >= 20} className="stepper-btn" style={{ opacity: servings >= 20 ? 0.3 : 1 }}>+</button>
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-2)' }}>
            {servings === 1 ? 'Just me' : `${servings} people`}
          </span>
        </div>
        <button onClick={handleSaveServings} disabled={savingServ} className="btn-primary btn tap-target">
          {savingServ ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save household size
        </button>
      </div>

      {/* ── Budget mode ───────────────────────────────── */}
      <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.18s both' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold flex items-center gap-2" style={{ fontSize: '16px', color: 'var(--text)' }}>
            <DollarSign size={16} style={{ color: 'var(--brand)' }} /> Budget mode
          </h3>
          <button onClick={() => setBudgetModeLocal(v => !v)}
            className="relative rounded-full transition-all duration-300 tap-target"
            style={{ width: '52px', height: '30px', background: budgetMode ? 'var(--brand)' : 'var(--border)' }}>
            <div className="absolute top-1 rounded-full bg-white shadow-md transition-transform duration-300"
              style={{ width: '22px', height: '22px', left: '4px', transform: budgetMode ? 'translateX(22px)' : 'translateX(0)' }} />
          </button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
          Set a weekly grocery budget — we'll suggest meals that fit and show you how your current plan compares.
        </p>

        {budgetMode && (
          <div style={{ animation: 'slideDown 0.3s ease' }}>
            <label className="input-label">Weekly budget</label>
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>$</span>
              <input type="number" min="10" max="500" step="5" className="input" style={{ width: '120px' }}
                value={weeklyBudget} onChange={e => setWeeklyBudgetLocal(Math.max(10, Number(e.target.value) || 0))} />
              <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>/ week for {servings} {servings === 1 ? 'person' : 'people'}</span>
            </div>

            {/* Outcome comparison */}
            {tierStyle && (
              <div className="p-4 rounded-2xl mb-4" style={{ background: tierStyle.bg, border: `1px solid ${tierStyle.color}30` }}>
                <p style={{ fontSize: '13px', color: tierStyle.color, fontWeight: 600 }}>
                  {tierStyle.emoji} At ${weeklyBudget}/week, you'll mostly eat <strong>{tierStyle.label.toLowerCase()}</strong> meals
                  {suggestedTier === 'budget' && ' — lots of room for variety!'}
                  {suggestedTier === 'medium' && ' — a good balance of variety and cost.'}
                  {suggestedTier === 'premium' && ' — premium ingredients fit comfortably.'}
                </p>
              </div>
            )}

            {currentPlanCost && (
              <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current plan costs</p>
                  <p className="font-display font-bold" style={{ fontSize: '20px', color: 'var(--text)' }}>{formatCost(currentPlanCost.total)}</p>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>vs target</p>
                  <p className="font-semibold" style={{ fontSize: '14px', color: currentPlanCost.total <= weeklyBudget ? 'var(--brand)' : '#D4502A' }}>
                    {currentPlanCost.total <= weeklyBudget ? '✓ Under budget' : `+${formatCost(currentPlanCost.total - weeklyBudget)} over`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={handleSaveBudget} disabled={savingBudget} className="btn-primary btn tap-target mt-4">
          {savingBudget ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save budget settings
        </button>
      </div>

      {/* ── Most-used meals ───────────────────────────── */}
      <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.19s both' }}>
        <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ fontSize: '16px', color: 'var(--text)' }}>
          <Award size={16} style={{ color: 'var(--brand)' }} /> Most-used meals
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '18px' }}>
          Your top meals from generated plans — what you actually eat most.
        </p>

        {loadingUsage ? (
          <div className="space-y-2">
            {[...Array(3)].map((_,i) => <div key={i} className="skeleton rounded-xl" style={{ height: '44px' }} />)}
          </div>
        ) : mostUsed.length === 0 ? (
          <p style={{ fontSize: '13.5px', color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
            Generate a few weekly plans and your favorites will show up here.
          </p>
        ) : (
          <div className="space-y-2">
            {mostUsed.map((m, i) => (
              <div key={m.meal_name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <span className="flex items-center justify-center font-bold rounded-lg shrink-0"
                  style={{ width: '26px', height: '26px', fontSize: '12px', background: i < 3 ? 'rgba(31,158,98,0.15)' : 'var(--surface)', color: i < 3 ? 'var(--brand)' : 'var(--text-3)' }}>
                  {i + 1}
                </span>
                <span className="flex-1 font-medium" style={{ fontSize: '14px', color: 'var(--text)' }}>{m.meal_name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>{m.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Data export ───────────────────────────────── */}
      <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.2s both' }}>
        <h3 className="font-semibold mb-1" style={{ fontSize: '16px', color: 'var(--text)' }}>Your data</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
          Download your full recipe library. Re-importable on any account.
        </p>
        <div className="flex gap-3">
          <button onClick={() => exportMealsAsJSON(meals, 'my-recipes.json')} className="btn-secondary btn">
            <Download size={16} /> JSON
          </button>
          <button onClick={() => exportMealsAsCSV(meals, 'my-recipes.csv')} className="btn-secondary btn">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* ── Account info ──────────────────────────────── */}
      <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.25s both' }}>
        <h3 className="font-semibold mb-4" style={{ fontSize: '16px', color: 'var(--text)' }}>Account</h3>
        <div className="space-y-4">
          {[
            { icon: Mail,   label: 'Email',        value: user?.email },
            { icon: Shield, label: 'Login method', value: user?.app_metadata?.provider === 'google' ? 'Google' : 'Email & password' },
            { icon: User,   label: 'Member since', value: joinDate },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between py-3"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="flex items-center gap-2" style={{ fontSize: '14px', color: 'var(--text-3)' }}>
                <Icon size={15} /> {label}
              </span>
              <span className="font-medium" style={{ fontSize: '14px', color: 'var(--text)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sign out ──────────────────────────────────── */}
      <button onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 active:scale-98"
        style={{ padding: '14px', fontSize: '15px', background: 'rgba(212,80,42,0.08)', border: '1.5px solid rgba(212,80,42,0.2)', color: '#D4502A', animation: 'slideUp 0.4s ease 0.3s both' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,80,42,0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,80,42,0.08)'}>
        <LogOut size={17} /> Sign out
      </button>

      <p className="text-center mt-6" style={{ fontSize: '12px', color: 'var(--border)' }}>
        Your data is private and never shared.
      </p>
    </div>
  )
}
