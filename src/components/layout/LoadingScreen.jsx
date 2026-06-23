export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-5" style={{ animation: 'fadeIn 0.35s ease' }}>
        <div className="relative" style={{ width: '72px', height: '72px' }}>
          <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg,var(--brand),var(--brand-dark))', animation: 'glowPulse 2.5s ease-in-out infinite' }} />
          <div className="relative w-full h-full rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,var(--brand),var(--brand-dark))' }}>
            <span style={{ fontSize: '32px' }}>🍽</span>
          </div>
        </div>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="rounded-full animate-bounce"
              style={{ width: '8px', height: '8px', background: 'var(--brand)', opacity: 0.7, animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Loading
        </p>
      </div>
    </div>
  )
}
