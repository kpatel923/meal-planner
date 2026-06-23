import { buildGroceryList } from '../../lib/mealLogic'
import { groupGroceryByCategory } from '../../lib/groceryCategories'
import { weeklyTimeTotal, formatPrepTime } from '../../lib/mealFacts'
import { weeklyBudgetTotal, formatCost } from '../../lib/budget'
import {
  ShoppingCart, ArrowLeftRight, Wand2, Receipt, Clock, DollarSign,
  FileDown, Printer, Link as LinkIcon, Users, Undo2, ChevronRight,
} from 'lucide-react'

// ── Week overview: headline time/cost + stat tiles + prep progress ──
export function WeekOverview({ stats, prepProgress, perDay, weeklyPlan, servings = 1 }) {
  const time = weeklyTimeTotal(weeklyPlan)
  const budget = weeklyBudgetTotal(weeklyPlan, servings)
  const timeLabel = time.mealsWithTime > 0 ? formatPrepTime(time.totalMinutes) : null

  const tiles = [
    { val: stats?.count ?? 0, label: 'Meals planned' },
    { val: perDay?.calories ? perDay.calories.toLocaleString() : '—', label: 'Avg cal / day' },
    { val: stats?.ingredients ?? 0, label: 'Ingredients' },
    { val: `${prepProgress.done}/${prepProgress.total}`, label: 'Prepped', accent: true },
  ]
  return (
    <div>
      {/* Headline: total cooking time + total cost for the week */}
      <div className="grid grid-cols-2 gap-1.5" style={{ marginBottom: 6 }}>
        <div className="rounded-xl" style={{ background: 'var(--brand-light)', padding: '11px 12px' }}>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--brand-text)', marginBottom: 4 }}>
            <Clock size={13} /><span style={{ fontSize: 10.5, fontWeight: 600 }}>Cooking time</span>
          </div>
          <div className="nums" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>
            {timeLabel || '—'}
          </div>
          {time.totalMeals > 0 && time.mealsWithTime < time.totalMeals && (
            <div style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 3 }}>
              {time.mealsWithTime}/{time.totalMeals} meals timed
            </div>
          )}
        </div>
        <div className="rounded-xl" style={{ background: 'var(--brand-light)', padding: '11px 12px' }}>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--brand-text)', marginBottom: 4 }}>
            <DollarSign size={13} /><span style={{ fontSize: 10.5, fontWeight: 600 }}>Est. cost</span>
          </div>
          <div className="nums" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>
            {budget.total > 0 ? formatCost(budget.total) : '—'}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 3 }}>
            ~{formatCost(budget.perDay)}/day · {servings} {servings === 1 ? 'person' : 'people'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {tiles.map((t, i) => (
          <div key={i} className="rounded-xl" style={{ background: 'var(--surface-2)', padding: '10px 11px' }}>
            <div className="nums" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1, color: t.accent ? 'var(--success)' : 'var(--text)' }}>
              {t.val}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 }}>{t.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
          <span>Prep progress</span><span className="nums">{prepProgress.pct}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: 'var(--success)', width: `${prepProgress.pct}%`, transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      </div>
    </div>
  )
}

// ── Grocery preview: counts by aisle category ──────────────────────
export function GroceryPreview({ weeklyPlan, onOpenFull }) {
  const groceryMap = weeklyPlan ? buildGroceryList(weeklyPlan) : {}
  const grouped = groupGroceryByCategory(groceryMap)
  const rows = Object.entries(grouped)
    .map(([name, items]) => ({ name, count: Object.keys(items).length }))
    .filter(r => r.count > 0)

  if (rows.length === 0) {
    return <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Generate a plan to see your shopping list.</p>
  }

  return (
    <div>
      <div className="flex flex-col" style={{ gap: 1 }}>
        {rows.map(r => (
          <div key={r.name} className="flex items-center gap-2 rounded-lg" style={{ padding: '7px 8px' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)', flex: 1 }}>{r.name}</span>
            <span className="nums" style={{ fontSize: 10.5, color: 'var(--text-3)', background: 'var(--surface-3)', borderRadius: 99, padding: '2px 8px' }}>{r.count}</span>
          </div>
        ))}
      </div>
      <button onClick={onOpenFull}
        className="w-full flex items-center justify-center gap-2 rounded-xl tap-target"
        style={{ marginTop: 8, height: 34, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontSize: 12.5 }}>
        <ShoppingCart size={14} /> View full shopping list
      </button>
    </div>
  )
}

// ── AI quick-prompt cards ──────────────────────────────────────────
export function AIPrompts({ onSwapSuggest, onRegenerate, onWhatCanIMake }) {
  const cards = [
    { icon: ArrowLeftRight, title: 'Suggest a swap', sub: 'Lighter option for a meal today', onClick: onSwapSuggest },
    { icon: Wand2, title: 'Regenerate week', sub: 'Fresh plan from your library', onClick: onRegenerate },
    { icon: Receipt, title: 'What can I make?', sub: 'Based on ingredients you have', onClick: onWhatCanIMake },
  ]
  return (
    <div className="flex flex-col gap-1.5">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <button key={i} onClick={c.onClick}
            className="text-left rounded-xl transition-all"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '10px 11px', transition: 'transform 0.18s cubic-bezier(0.22,1,0.36,1), border-color 0.18s ease' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
              <Icon size={14} style={{ color: 'var(--brand)' }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{c.title}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: 22 }}>{c.sub}</div>
          </button>
        )
      })}
    </div>
  )
}

// ── Quick actions list ─────────────────────────────────────────────
export function QuickActions({ onPDF, onPrint, onCopyLink, onShareHousehold, onUndoGenerate, canUndo }) {
  const actions = [
    { icon: FileDown, label: 'Export as PDF', onClick: onPDF },
    { icon: Printer, label: 'Print grocery list', onClick: onPrint },
    { icon: LinkIcon, label: 'Copy shareable link', onClick: onCopyLink },
    { icon: Users, label: 'Share with household', onClick: onShareHousehold },
    ...(canUndo ? [{ icon: Undo2, label: 'Undo last generate', onClick: onUndoGenerate }] : []),
  ]
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      {actions.map((a, i) => {
        const Icon = a.icon
        return (
          <button key={i} onClick={a.onClick}
            className="flex items-center gap-2.5 rounded-lg tap-target transition-all"
            style={{ padding: '8px 8px', color: 'var(--text-2)', fontSize: 12.5, background: 'transparent', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}>
            <Icon size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            {a.label}
          </button>
        )
      })}
    </div>
  )
}

// Small section wrapper used in the desktop sidebar.
export function PanelSection({ title, link, onLink, children }) {
  return (
    <div style={{ padding: '14px 14px', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{title}</span>
        {link && (
          <button onClick={onLink} className="flex items-center gap-0.5" style={{ fontSize: 11, color: 'var(--brand)' }}>
            {link} <ChevronRight size={12} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
