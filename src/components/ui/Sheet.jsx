import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

/**
 * Canonical popup surface for the whole app.
 * - Mobile: a bottom sheet that slides up, with drag-down-to-dismiss.
 * - Desktop: a centered dialog.
 * Handles backdrop tap, Esc, and body-scroll lock. Renders nothing when closed.
 *
 * Props: open, onClose, title, children, footer?, size ('md' | 'lg')
 */
export default function Sheet({ open, onClose, title, children, footer, size = 'md' }) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef(null)

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  function onTouchStart(e) { startY.current = e.touches[0].clientY }
  function onTouchMove(e) {
    if (startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy)
  }
  function onTouchEnd() {
    if (dragY > 90) onClose?.()
    setDragY(0)
    startY.current = null
  }

  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={`sheet-panel sheet-${size}`}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}>
        {/* Grip (mobile drag affordance) */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          className="sm:hidden" style={{ cursor: 'grab', touchAction: 'none' }}>
          <div className="sheet-grip" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-3">
            <h3 className="font-display font-bold" style={{ fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text)' }}>{title}</h3>
            <button onClick={onClose} aria-label="Close"
              className="flex items-center justify-center rounded-full tap-target"
              style={{ width: 32, height: 32, background: 'var(--surface-2)', color: 'var(--text-3)' }}>
              <X size={17} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5" style={{ flex: 1, paddingBottom: footer ? 12 : 20 }}>
          {children}
        </div>
        {footer && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--hairline)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
