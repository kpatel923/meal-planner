import { useCountUp } from '../../hooks/useCountUp'
import { nutritionColor } from '../../lib/nutrition'

// Segmented stat strip. Each segment: { value, label, color?, highlight? }.
// Numbers count up. Used for per-day and per-week summaries so both match.
function Segment({ seg, first }) {
  const numeric = typeof seg.raw === 'number' ? seg.raw : null
  const animated = useCountUp(numeric ?? 0)
  const display = numeric != null ? (seg.format ? seg.format(animated) : animated.toLocaleString()) : seg.value
  return (
    <div className="flex-1 text-center" style={{ borderLeft: first ? 'none' : '1px solid var(--border)', minWidth: 0 }}>
      <div className="nums font-display" style={{ fontSize: 15, fontWeight: 700, color: seg.color || 'var(--text)' }}>
        {display}
      </div>
      <div style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 1 }}>{seg.label}</div>
    </div>
  )
}

export default function StatBar({ segments = [], style }) {
  return (
    <div className="flex items-stretch rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '12px 2px', ...style }}>
      {segments.map((seg, i) => <Segment key={seg.label} seg={seg} first={i === 0} />)}
    </div>
  )
}

export { nutritionColor }
