import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMeals } from '../hooks/useMeals'
import { usePlans } from '../hooks/usePlans'
import { exportMealsAsJSON, exportMealsAsCSV } from '../lib/importExport'
import {
  User, Mail, Shield, Download, LogOut,
  Save, Loader2, ChefHat, Bookmark,
  BookOpen, Pencil, Check, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const DIET_OPTIONS = [
  { key: 'veg',    label: 'Vegetarian',  emoji: '🥦' },
  { key: 'vegan',  label: 'Vegan',       emoji: '🌱' },
  { key: 'nonveg', label: 'Non-Veg',     emoji: '🍗' },
]

export default function ProfilePage() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { meals }  = useMeals()
  const { plans }  = usePlans()
  const navigate   = useNavigate()

  const [editingName, setEditingName]   = useState(false)
  const [nameValue,   setNameValue]     = useState(profile?.username || '')
  const [savingName,  setSavingName]    = useState(false)
  const [savingPrefs, setSavingPrefs]   = useState(false)
  const [dietPrefs,   setDietPrefs]     = useState(profile?.diet_prefs || ['veg','vegan','nonveg'])

  const initials = (profile?.username || user?.email || 'U').charAt(0).toUpperCase()
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  // ── Save name ─────────────────────────────────────────────
  async function handleSaveName() {
    if (!nameValue.trim()) return
    setSavingName(true)
    const { error } = await updateProfile({ username: nameValue.trim() })
    if (error) toast.error('Could not update name')
    setSavingName(false)
    setEditingName(false)
  }

  // ── Save diet prefs ───────────────────────────────────────
  async function handleSaveDietPrefs() {
    if (dietPrefs.length === 0) {
      toast.error('Select at least one diet preference')
      return
    }
    setSavingPrefs(true)
    const { error } = await updateProfile({ diet_prefs: dietPrefs })
    if (error) toast.error('Could not save preferences')
    else toast.success('Preferences saved!')
    setSavingPrefs(false)
  }

  function toggleDiet(key) {
    setDietPrefs(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  // ── Sign out ──────────────────────────────────────────────
  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="page-container animate-fade-in max-w-2xl">
      <h1 className="section-title mb-8">Profile</h1>

      {/* Avatar + name card */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-sage-600 flex items-center justify-center text-white text-2xl font-display font-semibold shadow-card">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  className="input py-1.5 text-sm"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  autoFocus
                  placeholder="Your name"
                />
                <button onClick={handleSaveName} disabled={savingName} className="btn-primary btn-sm btn p-2">
                  {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button onClick={() => setEditingName(false)} className="btn-ghost btn-sm btn p-2">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl text-sage-900">
                  {profile?.username || 'Your Name'}
                </h2>
                <button
                  onClick={() => { setNameValue(profile?.username || ''); setEditingName(true) }}
                  className="btn-ghost p-1 text-sage-400 hover:text-sage-600"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="text-sm text-sage-400 flex items-center gap-1.5 mt-0.5">
              <Mail size={13} /> {user?.email}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-cream-100">
          {[
            { icon: BookOpen,  label: 'Recipes', value: meals.length },
            { icon: Bookmark,  label: 'Saved Plans', value: plans.length },
            { icon: ChefHat,   label: 'Member since', value: joinDate },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon size={16} className="text-sage-400 mx-auto mb-1" />
              <p className="font-display text-lg text-sage-800">{value}</p>
              <p className="text-xs text-sage-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Diet preferences */}
      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-sage-800 mb-1 text-sm">Diet preferences</h3>
        <p className="text-xs text-sage-400 mb-4">
          These are your defaults when generating a new meal plan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {DIET_OPTIONS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => toggleDiet(key)}
              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ` +
                (dietPrefs.includes(key)
                  ? 'border-sage-500 bg-sage-50 text-sage-800'
                  : 'border-cream-200 bg-white text-sage-400 hover:border-sage-200')
              }
            >
              <span className="text-lg">{emoji}</span>
              {label}
              {dietPrefs.includes(key) && (
                <Check size={14} className="ml-auto text-sage-500" />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={handleSaveDietPrefs}
          disabled={savingPrefs}
          className="btn-primary btn-sm btn"
        >
          {savingPrefs ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save preferences
        </button>
      </div>

      {/* Data & export */}
      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-sage-800 mb-1 text-sm">Your data</h3>
        <p className="text-xs text-sage-400 mb-4">
          Download your full recipe library. You can re-import this on any account.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportMealsAsJSON(meals, 'my-recipes.json')}
            className="btn-secondary btn-sm btn"
          >
            <Download size={14} /> Export as JSON
          </button>
          <button
            onClick={() => exportMealsAsCSV(meals, 'my-recipes.csv')}
            className="btn-secondary btn-sm btn"
          >
            <Download size={14} /> Export as CSV
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-sage-800 mb-4 text-sm">Account</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-sage-500">
              <Mail size={14} /> Email
            </span>
            <span className="text-sage-800 font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-sage-500">
              <Shield size={14} /> Account type
            </span>
            <span className="text-sage-800 font-medium capitalize">
              {user?.app_metadata?.provider === 'google' ? 'Google' : 'Email'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-sage-500">
              <User size={14} /> Member since
            </span>
            <span className="text-sage-800 font-medium">{joinDate}</span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="btn-danger btn w-full"
      >
        <LogOut size={16} /> Sign out
      </button>

      <p className="text-center text-xs text-sage-300 mt-6">
        Your data is private and never shared.
      </p>
    </div>
  )
}
