// A warm, consistent empty state used across screens. An emoji/icon in a soft
// tinted circle, a friendly headline, supporting copy, and an optional action.
export default function EmptyState({ emoji = '🍽️', title, message, action, actionLabel, icon: Icon }) {
  return (
    <div className="flex flex-col items-center text-center"
      style={{ padding: '44px 24px', animation: 'cardStagger 0.45s cubic-bezier(0.22,1,0.36,1) both' }}>
      <div className="flex items-center justify-center"
        style={{ width: 76, height: 76, borderRadius: 24, background: 'var(--accent-light)', fontSize: 34, marginBottom: 18 }}>
        {Icon ? <Icon size={32} style={{ color: 'var(--accent-dark)' }} /> : emoji}
      </div>
      <h3 className="font-display font-bold" style={{ fontSize: 19, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        {title}
      </h3>
      {message && (
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 6, maxWidth: 280, lineHeight: 1.55 }}>
          {message}
        </p>
      )}
      {action && actionLabel && (
        <button onClick={action} className="btn-primary btn tap-target gap-2 mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
