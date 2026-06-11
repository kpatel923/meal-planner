import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ChefHat, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode,    setMode]    = useState('login')   // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const [form, setForm] = useState({
    email: '', password: '', fullName: '', confirmPassword: ''
  })

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    if (mode === 'signup') {
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match')
        setLoading(false)
        return
      }
      if (form.password.length < 6) {
        toast.error('Password must be at least 6 characters')
        setLoading(false)
        return
      }
      const { error } = await signUp(form.email, form.password, form.fullName)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Account created! Check your email to confirm.', { duration: 6000 })
      }
    } else {
      const { error } = await signIn(form.email, form.password)
      if (error) toast.error(error.message)
    }

    setLoading(false)
  }

  async function handleGoogle() {
    const { error } = await signInWithGoogle()
    if (error) toast.error(error.message)
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (decorative — hidden on mobile) ─────── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-sage-600 p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          {['🥗','🍳','🍝','🥘','🍲','🥙','🫕','🥗','🍱','🍛'].map((emoji, i) => (
            <span
              key={i}
              className="absolute text-6xl select-none"
              style={{
                top:  `${(i * 13 + 5) % 90}%`,
                left: `${(i * 17 + 8) % 85}%`,
                transform: `rotate(${i % 2 === 0 ? 15 : -10}deg)`,
              }}
            >{emoji}</span>
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <ChefHat size={22} className="text-white" />
            </div>
            <span className="font-display text-white text-xl font-semibold">MealPlan</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="font-display text-4xl xl:text-5xl text-white leading-tight">
            Plan smarter,<br />
            <em>eat better.</em>
          </h1>
          <p className="text-sage-200 text-lg leading-relaxed max-w-sm">
            Personalized weekly meal plans, smart grocery lists, and your own recipe library — all in one place.
          </p>

          <div className="flex flex-col gap-3">
            {[
              { emoji: '🗓', text: 'AI-optimized weekly meal plans' },
              { emoji: '🛒', text: 'Auto-generated grocery lists' },
              { emoji: '📖', text: 'Your personal recipe library' },
              { emoji: '📄', text: 'Export to PDF, import recipes' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-white/90">
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm font-body">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sage-300 text-xs">
          © {new Date().getFullYear()} MealPlan. All rights reserved.
        </p>
      </div>

      {/* ── Right panel (form) ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-cream-50">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-sage-600 flex items-center justify-center">
              <ChefHat size={18} className="text-white" />
            </div>
            <span className="font-display text-sage-900 text-lg font-semibold">MealPlan</span>
          </div>

          <h2 className="font-display text-2xl text-sage-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-sage-500 mb-8">
            {mode === 'login'
              ? 'Sign in to your meal planner'
              : 'Get started — it\'s free'}
          </p>

          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="btn-secondary btn w-full mb-4 text-sage-800"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cream-300" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-cream-50 px-3 text-xs text-sage-400">or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="input-label">Full name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your name"
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600"
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="input-label">Confirm password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn w-full btn-lg mt-2"
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-sage-500 mt-6">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              className="text-sage-700 font-medium underline underline-offset-2 hover:text-sage-900"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
