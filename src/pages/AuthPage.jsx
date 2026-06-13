import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isMisconfigured } from '../lib/supabase'
import { Eye, EyeOff, Loader2, ChefHat, ArrowRight, Sparkles, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: '🗓', title: 'Smart weekly plans',     desc: 'AI picks meals that share ingredients to cut your grocery list' },
  { icon: '🛒', title: 'Auto grocery lists',     desc: 'One click from your plan to a fully checked shopping list' },
  { icon: '📖', title: 'Your recipe library',    desc: 'Add YouTube, Instagram, or any link — view it on the meal card' },
  { icon: '📄', title: 'Export everything',      desc: 'Download your plan as a PDF or export all recipes as JSON / CSV' },
]

const FOOD_ITEMS = ['🥑','🍳','🥗','🍝','🥘','🍱','🫕','🥙','🍲','🫐']

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode,    setMode]    = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [form,    setForm]    = useState({ email:'', password:'', fullName:'', confirmPassword:'' })

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    if (mode === 'signup') {
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); setLoading(false); return }
      if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); setLoading(false); return }
      const { error } = await signUp(form.email, form.password, form.fullName)
      if (error) toast.error(error.message)
      else toast.success('Account created! Check your email.', { duration: 6000 })
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
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Env warning */}
      {isMisconfigured && (
        <div className="fixed top-0 inset-x-0 z-50 px-5 py-3 flex items-center gap-3"
          style={{ background: '#B83A1E', color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}>
          <span>⚠️</span>
          <span><strong>.env.local</strong> is missing or wrong. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart with <code style={{ background:'rgba(0,0,0,0.2)', padding:'1px 6px', borderRadius:'4px' }}>npm run dev</code>.</span>
        </div>
      )}

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #071A0E 0%, #0C0B09 75%)' }}>

        {/* Floating food emojis */}
        {FOOD_ITEMS.map((emoji, i) => (
          <div key={i} className="absolute select-none pointer-events-none"
            style={{
              top:    `${[8,22,38,54,68,82,14,46,72,90][i]}%`,
              left:   `${[12,72,28,85,18,65,48,92,38,78][i]}%`,
              fontSize: `${[36,44,32,40,48,34,42,30,46,36][i]}px`,
              opacity: 0.07,
              animation: `float ${3.5 + i * 0.35}s ease-in-out ${i * 0.4}s infinite`,
            }}>
            {emoji}
          </div>
        ))}

        {/* Ambient glow */}
        <div className="absolute pointer-events-none"
          style={{ top:'30%', left:'40%', width:'400px', height:'400px', borderRadius:'50%',
            background:'radial-gradient(circle, rgba(31,158,98,0.13) 0%, transparent 70%)',
            transform:'translate(-50%,-50%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 px-10 pt-10">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background:'linear-gradient(145deg,#27B872,#0B4529)', boxShadow:'0 0 24px rgba(31,158,98,0.45)' }}>
            <ChefHat size={22} className="text-white" />
          </div>
          <span className="font-display font-semibold text-white" style={{ fontSize:'20px', letterSpacing:'-0.04em' }}>MealPlan</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 self-start"
            style={{ background:'rgba(31,158,98,0.15)', border:'1px solid rgba(31,158,98,0.28)' }}>
            <Sparkles size={13} style={{ color:'#3AB87D' }} />
            <span style={{ fontSize:'12px', fontWeight:700, color:'#3AB87D', letterSpacing:'0.05em' }}>SMART MEAL PLANNING</span>
          </div>

          <h1 className="font-display font-semibold text-white mb-5 leading-[1.05]"
            style={{ fontSize:'clamp(2.2rem,4.5vw,3.2rem)', letterSpacing:'-0.05em' }}>
            Eat well,<br />
            <span style={{ color:'#3AB87D' }}>every single week.</span>
          </h1>

          <p style={{ fontSize:'16px', color:'#4A6B56', lineHeight:'1.7', maxWidth:'380px', marginBottom:'40px' }}>
            Your personal meal planner — smart plans, clean grocery lists, and all your recipes in one beautiful place.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background:'rgba(31,158,98,0.1)', border:'1px solid rgba(31,158,98,0.18)' }}>
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-white" style={{ fontSize:'14px', letterSpacing:'-0.01em' }}>{title}</p>
                  <p style={{ fontSize:'12px', color:'#4A6B56', lineHeight:'1.5', marginTop:'2px' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 px-10 pb-8" style={{ fontSize:'11px', color:'#2A3D30' }}>
          © {new Date().getFullYear()} MealPlan — Free forever
        </p>
      </div>

      {/* ── RIGHT PANEL / FORM ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-14" style={{ background:'var(--bg)' }}>
        <div className="w-full max-w-[380px]" style={{ animation:'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(145deg,#27B872,#0B4529)', boxShadow:'0 0 16px rgba(31,158,98,0.4)' }}>
              <ChefHat size={17} className="text-white" />
            </div>
            <span className="font-display font-semibold" style={{ fontSize:'18px', color:'var(--text)', letterSpacing:'-0.04em' }}>
              MealPlan
            </span>
          </div>

          {/* Heading */}
          <h2 className="font-display font-semibold mb-1.5"
            style={{ fontSize:'2rem', color:'var(--text)', letterSpacing:'-0.045em', lineHeight:1 }}>
            {mode === 'login' ? 'Welcome back' : 'Get started free'}
          </h2>
          <p style={{ fontSize:'15px', color:'var(--text-3)', marginBottom:'28px' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account — it\'s free'}
          </p>

          {/* Google button */}
          <button onClick={handleGoogle} disabled={loading} className="btn-secondary btn w-full mb-5 gap-3" style={{ fontSize:'15px', padding:'13px 20px' }}>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background:'var(--border)' }} />
            <span style={{ fontSize:'12px', color:'var(--text-3)', fontWeight:600 }}>or with email</span>
            <div className="flex-1 h-px" style={{ background:'var(--border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div style={{ animation:'slideDown 0.25s ease' }}>
                <label className="input-label">Full name</label>
                <input className="input" type="text" placeholder="Your name"
                  value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
              </div>
            )}

            <div>
              <label className="input-label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input className="input" type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => set('password', e.target.value)}
                  style={{ paddingRight:'44px' }} required />
                <button type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color:'var(--text-3)' }}
                  onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div style={{ animation:'slideDown 0.25s ease' }}>
                <label className="input-label">Confirm password</label>
                <input className="input" type="password" placeholder="••••••••"
                  value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary btn w-full btn-lg mt-2" style={{ fontSize:'15px' }}>
              {loading
                ? <Loader2 size={18} className="animate-[spin_1s_linear_infinite]" />
                : <>
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                    <ArrowRight size={17} />
                  </>
              }
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center mt-7" style={{ fontSize:'14px', color:'var(--text-3)' }}>
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              className="font-semibold transition-opacity hover:opacity-70"
              style={{ color:'var(--brand)' }}
              onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign up free →' : 'Sign in'}
            </button>
          </p>

          {/* Trust badges */}
          {mode === 'signup' && (
            <div className="flex items-center justify-center gap-5 mt-8" style={{ animation:'fadeIn 0.4s ease' }}>
              {['Free forever','No credit card','Cancel anytime'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <Check size={12} style={{ color:'var(--brand)' }} />
                  <span style={{ fontSize:'11px', color:'var(--text-3)', fontWeight:600 }}>{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
