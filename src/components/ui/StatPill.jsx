import { Flame, Clock, DollarSign, Beef } from 'lucide-react'

// One canonical "stat pill" used everywhere calories/time/cost/protein appear.
// kind: 'cal' | 'time' | 'cost' | 'protein'
// tone: 'accent' (highlighted) | 'muted' (dimmed, e.g. completed) | 'plain'
const ICONS = { cal: Flame, time: Clock, cost: DollarSign, protein: Beef }

export default function StatPill({ kind = 'cal', value, tone = 'accent', size = 'md' }) {
  if (value == null) return null
  const Icon = ICONS[kind] || Flame
  const isSm = size === 'sm'

  const tones = {
    accent: { bg: 'var(--accent-light)', fg: 'var(--accent-text)', icon: 'var(--accent-dark)' },
    muted:  { bg: 'var(--surface-2)',    fg: 'var(--text-3)',      icon: 'var(--text-3)' },
    plain:  { bg: 'transparent',         fg: 'var(--text-3)',      icon: 'var(--text-3)' },
  }
  const t = tones[tone] || tones.accent

  return (
    <span className="inline-flex items-center gap-1 shrink-0"
      style={{
        background: t.bg, borderRadius: 8,
        padding: isSm ? '2px 6px' : '3px 8px',
      }}>
      <Icon size={isSm ? 11 : 12} style={{ color: t.icon }} />
      <span className="nums font-display" style={{ fontSize: isSm ? 11 : 12, fontWeight: 700, color: t.fg }}>
        {value}
      </span>
    </span>
  )
}
