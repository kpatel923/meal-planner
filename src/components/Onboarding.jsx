import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePlanStore } from '../hooks/usePlanStore'
import { ChefHat, ArrowRight, Check, Users, Sparkles } from 'lucide-react'

const STEPS = [
  { id: 'welcome',   title: 'Welcome to MealPlan' },
  { id: 'diet',      title: 'Your diet preferences' },
  { id: 'household', title: 'Your household' },
  { id: 'ready',     title: "You're all set!" },
]

const DIET_OPTIONS = [
  { key: 'veg',    label: 'Vegetarian', emoji: '🥦', desc: 'No meat or fish' },
  { key: 'vegan',  label: 'Vegan',      emoji: '🌱', desc: 'No animal products' },
  { key: 'nonveg', label: 'Non-Veg',    emoji: '🍗', desc: 'Includes meat & fish' },
]

export default function Onboarding({ onComplete }) {
  const { updateProfile } = useAuth()
  const { setServings, setDietTypes } = usePlanStore()

  const [step,      setStep]      = useState(0)
  const [diets,     setDiets]     = useState(['veg','vegan','nonveg'])
  const [servings,  setServLocal] = useState(2)
  const [saving,    setSaving]    = useState(false)

  function toggleDiet(key) {
    setDiets(p => p.includes(key) ? p.filter(d => d !== key) : [...p, key])
  }

  async function handleFinish() {
    setSaving(true)
    await updateProfile({
      diet_prefs:       diets,
      default_servings: servings,
      onboarding_done:  true,
    })
    setDietTypes(diets)
    setServings(servings)
    setSaving(false)
    onComplete()
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}>
      <div className="w-full max-w-lg" style={{ animation: 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="rounded-full transition-all duration-300"
              style={{
                width:  i === step ? '24px' : '8px',
                height: '8px',
                background: i <= step ? 'var(--brand)' : 'rgba(255,255,255,0.3)',
              }} />
          ))}
        </div>

        <div className="card overflow-hidden" style={{ borderRadius: '24px' }}>

          {/* ── Step 0: Welcome ────────────────────────────── */}
          {step === 0 && (
            <div className="p-8 sm:p-10 text-center" style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(145deg,#27B872,#0B4529)', boxShadow: '0 0 32px rgba(31,158,98,0.4)', fontSize: '40px' }}>
                🍽
              </div>
              <h2 className="font-display font-bold mb-3" style={{ fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.04em' }}>
                Welcome to MealPlan
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--text-3)', lineHeight: '1.7', maxWidth: '360px', margin: '0 auto 32px' }}>
                Smart weekly meal plans, auto grocery lists, and all your recipes in one place. Let's get you set up in 30 seconds.
              </p>
              <div className="flex flex-col gap-3 text-left mb-8">
                {[
                  { icon: '📅', text: 'AI-powered weekly meal plans in one tap' },
                  { icon: '🛒', text: 'Grocery list auto-generated from your plan' },
                  { icon: '📖', text: 'Your personal recipe library with 120 starter meals' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-2)' }}>{text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="btn-primary btn btn-lg w-full gap-2">
                Let's go <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ── Step 1: Diet prefs ─────────────────────────── */}
          {step === 1 && (
            <div className="p-8 sm:p-10" style={{ animation: 'slideUp 0.3s ease' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background: 'rgba(31,158,98,0.1)', border: '1px solid rgba(31,158,98,0.2)' }}>🥦</div>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Step 2 of 3</p>
                  <h3 className="font-display font-bold" style={{ fontSize: '22px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
                    What do you eat?
                  </h3>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '24px' }}>
                Select all that apply — we'll use this to filter your meal plans.
              </p>
              <div className="space-y-3 mb-8">
                {DIET_OPTIONS.map(({ key, label, emoji, desc }) => {
                  const active = diets.includes(key)
                  return (
                    <button key={key} onClick={() => toggleDiet(key)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left tap-target"
                      style={{
                        borderColor: active ? 'var(--brand)' : 'var(--border)',
                        background:  active ? 'rgba(31,158,98,0.08)' : 'var(--surface-2)',
                      }}>
                      <span style={{ fontSize: '28px' }}>{emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold" style={{ fontSize: '15px', color: 'var(--text)' }}>{label}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>{desc}</p>
                      </div>
                      {active && <Check size={20} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-secondary btn flex-1 tap-target">Back</button>
                <button onClick={() => setStep(2)} disabled={diets.length === 0}
                  className="btn-primary btn flex-1 tap-target gap-2">
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Household size ─────────────────────── */}
          {step === 2 && (
            <div className="p-8 sm:p-10" style={{ animation: 'slideUp 0.3s ease' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(31,158,98,0.1)', border: '1px solid rgba(31,158,98,0.2)' }}>
                  <Users size={20} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Step 3 of 3</p>
                  <h3 className="font-display font-bold" style={{ fontSize: '22px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
                    Who are you cooking for?
                  </h3>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '32px' }}>
                We'll use this to scale grocery quantities and portion sizes.
              </p>

              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="stepper" style={{ transform: 'scale(1.2)' }}>
                  <button onClick={() => setServLocal(p => Math.max(1, p - 1))}
                    disabled={servings <= 1} className="stepper-btn"
                    style={{ opacity: servings <= 1 ? 0.3 : 1 }}>−</button>
                  <span className="stepper-value">{servings}</span>
                  <button onClick={() => setServLocal(p => Math.min(20, p + 1))}
                    disabled={servings >= 20} className="stepper-btn"
                    style={{ opacity: servings >= 20 ? 0.3 : 1 }}>+</button>
                </div>
                <p className="font-display font-semibold" style={{ fontSize: '22px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  {servings === 1 ? 'Just me' : `${servings} people`}
                </p>
              </div>

              {/* Quick select buttons */}
              <div className="flex gap-2 justify-center mb-8 flex-wrap">
                {[[1,'Solo'],[2,'Couple'],[3,'Small family'],[4,'Family'],[6,'Big family']].map(([n, label]) => (
                  <button key={n} onClick={() => setServLocal(n)}
                    className="px-4 py-2 rounded-full font-semibold transition-all tap-target"
                    style={{
                      fontSize: '13px',
                      border: `2px solid ${servings === n ? 'var(--brand)' : 'var(--border)'}`,
                      background: servings === n ? 'rgba(31,158,98,0.1)' : 'transparent',
                      color: servings === n ? 'var(--brand)' : 'var(--text-3)',
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary btn flex-1 tap-target">Back</button>
                <button onClick={() => setStep(3)} className="btn-primary btn flex-1 tap-target gap-2">
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Ready ──────────────────────────────── */}
          {step === 3 && (
            <div className="p-8 sm:p-10 text-center" style={{ animation: 'scaleIn 0.3s ease' }}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(145deg,#27B872,#0B4529)', boxShadow: '0 0 32px rgba(31,158,98,0.4)' }}>
                <Sparkles size={36} className="text-white" />
              </div>
              <h2 className="font-display font-bold mb-3" style={{ fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.04em' }}>
                You're all set! 🎉
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-3)', lineHeight: '1.7', marginBottom: '32px' }}>
                Your preferences are saved. Head to the Planner and generate your first week — it takes one tap.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { label: 'Diet', value: diets.map(d => d === 'nonveg' ? 'Non-Veg' : d.charAt(0).toUpperCase() + d.slice(1)).join(', ') },
                  { label: 'Cooking for', value: servings === 1 ? 'Just me' : `${servings} people` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-4 rounded-2xl text-left"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</p>
                    <p className="font-semibold" style={{ fontSize: '14px', color: 'var(--text)' }}>{value}</p>
                  </div>
                ))}
              </div>
              <button onClick={handleFinish} disabled={saving} className="btn-primary btn btn-lg w-full gap-2">
                {saving ? 'Saving…' : <>Start planning <ArrowRight size={18} /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
