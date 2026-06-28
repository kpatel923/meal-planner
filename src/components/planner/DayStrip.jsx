import { DAYS, CATEGORIES } from '../../lib/mealLogic'

const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Horizontal day selector. Each tab shows up to 4 status pips — one per
 * planned meal — green when prepped, amber when planned-not-prepped.
 * Auto-scrolls the active tab into view (matters on mobile).
 *
 * @param weekDates  array of 7 Date objects (Mon-Sun) for the displayed week
 * @param todayIdx   0-6 index of today, or -1
 */
export default function DayStrip({ weeklyPlan, activeDay, onSelect, isPrepDone, weekDates, todayIdx }) {
  return (
    <div
      className="flex gap-1 px-1 py-1"
      role="tablist" aria-label="Days of the week"
    >
      {DAYS.map((day, i) => {
        const dayMeals = weeklyPlan?.[i] || {}
        const planned = CATEGORIES.filter(c => dayMeals[c])
        const isActive = i === activeDay
        const isToday = i === todayIdx
        const dateNum = weekDates?.[i]?.getDate?.() ?? (i + 1)

        return (
          <button
            key={day}
            role="tab"
            aria-selected={isActive}
            aria-label={`${day}${isToday ? ', today' : ''}, ${planned.length} meals planned`}
            onClick={() => onSelect(i)}
            className="flex flex-col items-center transition-all tap-target"
            style={{
              flex: 1, minWidth: 0, padding: '8px 2px 7px',
              borderRadius: 14,
              background: isActive ? 'var(--brand)' : 'var(--surface)',
              border: `1px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`,
              boxShadow: isActive ? 'var(--shadow-brand)' : 'var(--shadow-xs)',
              transform: isActive ? 'translateY(-1px)' : 'none',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
          >
            <span style={{
              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: isActive ? 'rgba(255,255,255,0.65)' : 'var(--text-3)',
            }}>
              {SHORT[i]}
            </span>
            <span className="nums" style={{
              fontSize: 17, fontWeight: 700, lineHeight: 1.15, marginTop: 1,
              color: isActive ? '#fff' : (isToday ? 'var(--accent-text)' : 'var(--text)'),
            }}>
              {dateNum}
            </span>
            <div className="flex gap-0.5 items-center justify-center" style={{ marginTop: 5, height: 4 }}>
              {planned.length > 0 ? planned.map(c => (
                <span key={c} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: isActive
                    ? (isPrepDone(i, c) ? 'var(--accent)' : 'rgba(255,255,255,0.6)')
                    : (isPrepDone(i, c) ? 'var(--success)' : '#D9A12E'),
                  animation: 'pipFill 0.3s ease both',
                }} />
              )) : (
                [0, 1, 2, 3].map(d => (
                  <span key={d} style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border-2)' }} />
                ))
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
