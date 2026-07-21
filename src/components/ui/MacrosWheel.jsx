import ProgressRing from './ProgressRing'

// Daily macros wheel: a prominent calories ring with protein / carbs / fat
// supporting rings. Fills as meals get checked off. Rings with no goal or no
// data show gracefully (empty track) so the user can fill macros in later.
//
// Props:
//   consumed = { calories, protein_g, carbs_g, fat_g }   (checked-off total)
//   goals    = { calories, protein, carbs, fat }         (nulls allowed)
export default function MacrosWheel({ consumed, goals }) {
  const cal = consumed.calories || 0
  const calGoal = goals.calories || 2000

  const macros = [
    { key: 'protein_g', label: 'Protein', value: consumed.protein_g || 0, goal: goals.protein || 120, color: 'var(--accent)', unit: 'g' },
    { key: 'carbs_g',   label: 'Carbs',   value: consumed.carbs_g   || 0, goal: goals.carbs   || 250, color: '#E0A72E', unit: 'g' },
    { key: 'fat_g',     label: 'Fat',     value: consumed.fat_g     || 0, goal: goals.fat     || 70,  color: '#C77CB5', unit: 'g' },
  ]

  const calPct = Math.round((cal / calGoal) * 100)

  return (
    <div className="card" style={{ padding: '20px 18px' }}>
      <div className="flex items-center gap-5">
        {/* Calories — the hero ring */}
        <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
          <ProgressRing value={cal} max={calGoal} size={108} stroke={9}
            color="var(--accent)" track="var(--surface-2)" />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span className="nums font-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{cal}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>/ {calGoal} cal</span>
          </div>
        </div>

        {/* Supporting macro rings */}
        <div className="flex-1 flex items-center justify-around gap-2">
          {macros.map(m => (
            <div key={m.key} className="flex flex-col items-center gap-1.5">
              <ProgressRing value={m.value} max={m.goal} size={52} stroke={5}
                color={m.color} track="var(--surface-2)"
                label={Math.round(m.value)} labelColor="var(--text)" />
              <div className="text-center">
                <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)' }}>{m.label}</p>
                <p className="nums" style={{ fontSize: 9.5, color: 'var(--text-3)' }}>/ {m.goal}{m.unit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress caption */}
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--hairline, var(--border))' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Today's intake as you cook</span>
        <span className="nums" style={{ fontSize: 12, fontWeight: 700, color: calPct >= 100 ? 'var(--accent-dark)' : 'var(--text-2)' }}>
          {calPct}% of calories
        </span>
      </div>
    </div>
  )
}
