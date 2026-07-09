// Small uppercase section label, e.g. "Today's meals".
export default function SectionLabel({ children, style }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: 'var(--text-3)',
      margin: '0 4px 10px', ...style,
    }}>
      {children}
    </p>
  )
}
