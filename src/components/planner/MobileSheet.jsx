import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

/**
 * A bottom sheet for mobile. Slides up from the bottom, dims the page,
 * supports drag-down-to-dismiss on the grip, closes on backdrop tap or Esc.
 * Renders nothing when `open` is false.
 */
export default function MobileSheet({ open, onClose, title, children }) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    // lock body scroll while open
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
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className="sheet-panel"
        role="dialog" aria-modal="true" aria-label={title}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <div className="sheet-grip" />
        </div>
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <h3 className="font-display font-semibold" style={{ fontSize: 16, color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} aria-label="Close"
            className="flex items-center justify-center rounded-lg tap-target"
            style={{ width: 32, height: 32, color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </>
  )
}
