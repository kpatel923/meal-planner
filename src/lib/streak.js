// ── Forgiving cooking streak ──────────────────────────────────────────
// A gentle streak: a "cooked day" is any day the user marked >=1 meal prepped.
// Missed days don't instantly break the streak — each week grants up to 2
// automatic "freeze" days that absorb misses. We persist a lightweight history
// in localStorage (date -> cooked bool) so the streak survives across sessions
// without needing server storage.
//
// Design intent: reward, never punish. The streak should feel encouraging.

const HISTORY_KEY = 'mealplan_cook_history'   // { "2026-07-08": true, ... }
const BEST_KEY    = 'mealplan_streak_best'

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}') } catch { return {} }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) } catch {}
}
function dateKey(d) {
  return d.toISOString().slice(0, 10)   // YYYY-MM-DD
}

// Record whether the user cooked today (called when prep changes).
export function recordCookedToday(cooked) {
  const h = loadHistory()
  const k = dateKey(new Date())
  if (cooked) h[k] = true
  else delete h[k]
  saveHistory(h)
  return h
}

// Compute the current streak with forgiveness.
// Walks backwards from today; a non-cooked day is tolerated if we still have
// freeze budget for that ISO week (2 per week). Returns { current, best, freezesUsedThisWeek, today }.
export function computeStreak(history) {
  const h = history || loadHistory()
  const today = new Date()
  const todayKey = dateKey(today)

  let current = 0
  let freezesByWeek = {}
  let cursor = new Date(today)

  // If today isn't cooked yet, don't count today as a miss — start from today
  // but allow it to be "pending" (streak reflects days already earned).
  const cookedToday = !!h[todayKey]
  if (!cookedToday) cursor.setDate(cursor.getDate() - 1)   // evaluate from yesterday

  // Walk back up to a year.
  for (let i = 0; i < 366; i++) {
    const k = dateKey(cursor)
    const wk = isoWeek(cursor)
    if (h[k]) {
      current++
    } else {
      // Missed day — try to spend a freeze for that week.
      freezesByWeek[wk] = (freezesByWeek[wk] || 0)
      if (freezesByWeek[wk] < 2) {
        freezesByWeek[wk]++   // freeze absorbs the miss, streak continues
      } else {
        break                 // out of freezes → streak ends here
      }
    }
    cursor.setDate(cursor.getDate() - 1)
  }

  // If today IS cooked, it adds to the streak on top.
  if (cookedToday) current++

  let best = 0
  try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0 } catch {}
  if (current > best) {
    best = current
    try { localStorage.setItem(BEST_KEY, String(best)) } catch {}
  }

  const thisWeek = isoWeek(today)
  return { current, best, freezesUsedThisWeek: freezesByWeek[thisWeek] || 0, cookedToday }
}

// Simple ISO week key like "2026-W28" for grouping freeze budgets.
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${date.getUTCFullYear()}-W${week}`
}

// Build a 7-day (Mon..Sun) view of the current week for display.
// Returns array of { label, cooked, isFuture, isToday }.
export function currentWeekDays(history) {
  const h = history || loadHistory()
  const today = new Date()
  const todayIdx = (today.getDay() + 6) % 7   // Mon=0
  const monday = new Date(today)
  monday.setDate(today.getDate() - todayIdx)
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    out.push({
      label: labels[i],
      cooked: !!h[dateKey(d)],
      isFuture: i > todayIdx,
      isToday: i === todayIdx,
    })
  }
  return out
}
