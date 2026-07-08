import { useRef, useState, useCallback } from 'react'

// Swipe-down-to-dismiss for bottom-sheet / modal cards on touch devices.
// Returns handlers to spread on the draggable element + a live translateY.
// Only engages on touch; ignores mouse so desktop is unaffected.
export function useSwipeToClose(onClose, { threshold = 110 } = {}) {
  const startY = useRef(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const onTouchStart = useCallback((e) => {
    // Only start the drag if the sheet content is scrolled to the top, so we
    // don't hijack normal inner scrolling.
    const scroller = e.currentTarget
    if (scroller && scroller.scrollTop > 0) { startY.current = null; return }
    startY.current = e.touches[0].clientY
    setDragging(true)
  }, [])

  const onTouchMove = useCallback((e) => {
    if (startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy)   // only allow downward drag
  }, [])

  const onTouchEnd = useCallback(() => {
    if (startY.current == null) return
    if (dragY > threshold) {
      setDragY(0); setDragging(false); startY.current = null
      onClose?.()
    } else {
      setDragY(0); setDragging(false); startY.current = null
    }
  }, [dragY, threshold, onClose])

  const handlers = { onTouchStart, onTouchMove, onTouchEnd }
  const style = {
    transform: dragY ? `translateY(${dragY}px)` : undefined,
    transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
  }
  return { handlers, style, dragY }
}
