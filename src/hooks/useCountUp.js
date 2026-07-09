import { useState, useEffect, useRef } from 'react'

// Smoothly animates a number from its previous value to the target.
// Respects prefers-reduced-motion (jumps instantly). Returns the display value.
export function useCountUp(target, { duration = 650 } = {}) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(null)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' &&
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    const to = target
    if (reduce || from === to) { setValue(to); fromRef.current = to; return }

    let start = null
    const tick = (t) => {
      if (start == null) start = t
      const p = Math.min((t - start) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(from + (to - from) * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => rafRef.current && cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}
