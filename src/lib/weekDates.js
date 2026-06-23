// ── Week date helpers ────────────────────────────────────────────────
// The plan is keyed by day index 0–6 (Monday–Sunday). The app anchors the
// displayed dates to the *current* calendar week, with Monday as day 0.
// Centralised here so the planner header, day strip, and any export share
// one source of truth.

export function getWeekDates(reference = new Date()) {
  const today = new Date(reference)
  const mondayOffset = (today.getDay() + 6) % 7   // 0 = Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

// Index (0–6) of today within the current week, or -1 if today is outside it.
export function getTodayIndex(reference = new Date()) {
  const today = new Date(reference)
  return (today.getDay() + 6) % 7
}

// "Jun 22 – 28" style label for the week range.
export function formatWeekRange(dates) {
  if (!dates?.length) return ''
  const first = dates[0]
  const last = dates[6]
  const m = { month: 'short' }
  const firstMonth = first.toLocaleDateString('en-US', m)
  const lastMonth = last.toLocaleDateString('en-US', m)
  if (firstMonth === lastMonth) {
    return `${firstMonth} ${first.getDate()} – ${last.getDate()}`
  }
  return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}`
}
