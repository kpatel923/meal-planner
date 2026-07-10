/**
 * Consistent page header used across the redesigned pages.
 * Title on the left, optional actions on the right, optional sticky behavior.
 */
export default function PageHeader({ eyebrow, title, subtitle, actions, sticky = false }) {
  return (
    <div
      className={sticky ? 'sticky top-0 z-30' : ''}
      style={sticky ? {
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        marginLeft: -1, marginRight: -1,
      } : undefined}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap"
        style={{ padding: sticky ? '16px 0 14px' : '0 0 10px' }}>
        <div className="min-w-0">
          {eyebrow && (
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-dark)' }}>
              {eyebrow}
            </span>
          )}
          <h1 className="font-display font-bold" style={{ fontSize: 26, letterSpacing: '-0.03em', color: 'var(--text)', marginTop: eyebrow ? 3 : 0 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 5, lineHeight: 1.5 }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap shrink-0 no-print">{actions}</div>}
      </div>
    </div>
  )
}
