import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Play, Pause, Loader2, Check } from 'lucide-react'
import { generateCookSteps } from '../lib/aiFeatures'
import { successHaptic, tapHaptic } from '../lib/haptics'

// Simple in-memory cache so re-opening the same recipe doesn't regenerate.
const stepCache = new Map()

function fmt(s) {
  const m = Math.floor(s / 60), x = s % 60
  return `${m}:${String(x).padStart(2, '0')}`
}

export default function CookMode({ meal, onClose, onDone }) {
  const [steps, setSteps] = useState(null)
  const [error, setError] = useState(false)
  const [i, setI] = useState(0)
  const [tLeft, setTLeft] = useState(0)
  const [tRunning, setTRunning] = useState(false)
  const tickRef = useRef(null)
  const wakeRef = useRef(null)

  // Load steps (cached).
  useEffect(() => {
    let cancelled = false
    const key = meal?.id || meal?.item_name
    if (key && stepCache.has(key)) { setSteps(stepCache.get(key)); return }
    generateCookSteps(meal)
      .then(s => { if (!cancelled) { setSteps(s); if (key) stepCache.set(key, s) } })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [meal])

  // Keep the screen awake while cooking.
  useEffect(() => {
    let released = false
    async function lock() {
      try {
        if ('wakeLock' in navigator) {
          wakeRef.current = await navigator.wakeLock.request('screen')
        }
      } catch { /* not supported — fine */ }
    }
    lock()
    const onVis = () => { if (document.visibilityState === 'visible' && !released) lock() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVis)
      try { wakeRef.current && wakeRef.current.release() } catch {}
    }
  }, [])

  // Timer tick.
  useEffect(() => {
    if (!tRunning) return
    tickRef.current = setInterval(() => {
      setTLeft(prev => {
        if (prev <= 1) { clearInterval(tickRef.current); setTRunning(false); successHaptic(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [tRunning])

  function resetTimer() { clearInterval(tickRef.current); setTRunning(false); setTLeft(0) }
  function go(delta) { tapHaptic(); resetTimer(); setI(v => Math.max(0, Math.min((steps?.length || 1) - 1, v + delta))) }

  const step = steps?.[i]
  const isLast = steps && i === steps.length - 1

  return (
    <div className="fixed inset-0 z-[90] flex flex-col modal-safe" style={{ background: '#141611', animation: 'fadeIn 0.2s ease' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9BD531' }}>Cook mode</span>
        <button onClick={onClose} aria-label="Exit cook mode" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={22} /></button>
      </div>
      <p className="px-5 font-display font-semibold" style={{ fontSize: 16, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16 }}>
        {meal?.item_name}
      </p>

      {/* Progress segments */}
      {steps && (
        <div className="flex gap-1 px-5 mb-6">
          {steps.map((_, k) => (
            <div key={k} style={{ flex: 1, height: 4, borderRadius: 99, background: k <= i ? '#9BD531' : 'rgba(255,255,255,0.15)', transition: 'background 0.3s' }} />
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 px-6 overflow-y-auto">
        {!steps && !error && (
          <div className="h-full flex flex-col items-center justify-center gap-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Loader2 size={28} className="animate-[spin_1s_linear_infinite]" />
            <p style={{ fontSize: 14 }}>Preparing your steps…</p>
          </div>
        )}
        {error && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <p style={{ fontSize: 15 }}>Couldn't load steps for this recipe.</p>
            <button onClick={onClose} className="btn-primary btn tap-target">Close</button>
          </div>
        )}
        {step && (
          <div style={{ animation: 'slideUp 0.3s ease both' }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
              Step {i + 1} of {steps.length}
            </p>
            <p className="font-display font-bold" style={{ fontSize: 26, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 20 }}>
              {step.text}
            </p>

            {step.timerSeconds != null && (
              <button
                onClick={() => {
                  if (!tRunning) { setTLeft(tLeft > 0 ? tLeft : step.timerSeconds); setTRunning(true); tapHaptic() }
                  else { setTRunning(false) }
                }}
                className="w-full flex items-center justify-between tap-target"
                style={{ background: 'rgba(124,181,24,0.14)', border: '1px solid #7CB518', borderRadius: 16, padding: 16 }}>
                <div className="text-left">
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9BD531' }}>
                    {tRunning ? 'Timer running' : tLeft > 0 ? 'Paused' : 'Tap to start timer'}
                  </div>
                  <div className="nums font-display" style={{ fontSize: 30, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                    {fmt(tRunning || tLeft > 0 ? tLeft : step.timerSeconds)}
                  </div>
                </div>
                <div className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: '50%', background: '#9BD531', color: '#141611' }}>
                  {tRunning ? <Pause size={20} /> : <Play size={20} />}
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {steps && (
        <div className="flex gap-2.5 px-5 pb-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
          <button onClick={() => go(-1)} disabled={i === 0}
            className="flex items-center justify-center gap-1 tap-target font-display font-semibold"
            style={{ flex: 1, padding: 15, borderRadius: 15, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: i === 0 ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 15 }}>
            <ChevronLeft size={18} /> Back
          </button>
          {isLast ? (
            <button onClick={() => { successHaptic(); onDone?.(); onClose() }}
              className="flex items-center justify-center gap-2 tap-target font-display font-bold"
              style={{ flex: 2, padding: 15, borderRadius: 15, background: '#9BD531', color: '#141611', fontSize: 15 }}>
              <Check size={18} /> Done cooking
            </button>
          ) : (
            <button onClick={() => go(1)}
              className="flex items-center justify-center gap-1 tap-target font-display font-bold"
              style={{ flex: 2, padding: 15, borderRadius: 15, background: '#9BD531', color: '#141611', fontSize: 15 }}>
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
