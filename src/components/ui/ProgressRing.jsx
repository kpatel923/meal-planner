// Animated circular progress ring. Springs to its value; center shows label.
export default function ProgressRing({
  value = 0, max = 1, size = 48, stroke = 5,
  color = 'var(--accent)', track = 'var(--surface-2)',
  label, labelColor = 'var(--text)',
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const offset = c * (1 - pct)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34,1.2,0.4,1)' }} />
      </svg>
      {label != null && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="nums font-display" style={{ fontSize: size * 0.27, fontWeight: 800, color: labelColor }}>
            {label}
          </span>
        </div>
      )}
    </div>
  )
}
