import { useEffect, type MutableRefObject, type RefObject } from 'react'

export type SwipeGesture = 'idle' | 'pending' | 'swipe' | 'scroll' | 'reorder'

export interface SwipeGestureState {
  offset: number
  gesture: SwipeGesture
  startX: number
  startY: number
  base: number
  captured: boolean
  moved: boolean
}

interface CollapseCallbacks {
  onCollapsed: () => void
}

export function usePreventSwipeScroll(
  row: RefObject<HTMLLIElement | null>,
  state: MutableRefObject<SwipeGestureState>,
) {
  useEffect(() => {
    const element = row.current
    if (!element) return
    const preventSwipeScroll = (event: TouchEvent) => {
      const current = state.current
      if (current.gesture === 'pending') {
        const touch = event.touches[0]
        if (touch) {
          const dx = touch.clientX - current.startX
          const dy = touch.clientY - current.startY
          if (Math.hypot(dx, dy) > 10 && Math.abs(dx) > Math.abs(dy)) {
            current.gesture = 'swipe'
            current.moved = true
            current.startX += Math.sign(dx) * 10
          }
        }
      }
      if (current.gesture === 'swipe' || current.gesture === 'reorder') event.preventDefault()
    }
    element.addEventListener('touchmove', preventSwipeScroll, { passive: false })
    return () => element.removeEventListener('touchmove', preventSwipeScroll)
  }, [row, state])
}

export function useCollapseRow(
  row: RefObject<HTMLLIElement | null>,
  collapsing: boolean,
  callbacks: MutableRefObject<CollapseCallbacks>,
) {
  useEffect(() => {
    const element = row.current
    if (!collapsing || !element) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // oxlint-disable-next-line react/immutability -- this DOM animation intentionally updates the row's styles.
    element.style.overflow = 'hidden'
    element.style.height = `${element.offsetHeight}px`
    void element.offsetHeight
    element.style.transition = reduceMotion
      ? 'opacity 200ms ease-out'
      : 'height 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease-out'
    if (!reduceMotion) element.style.height = '0px'
    element.style.opacity = '0'
    const timeout = window.setTimeout(() => callbacks.current.onCollapsed(), reduceMotion ? 200 : 320)
    return () => window.clearTimeout(timeout)
  }, [callbacks, collapsing, row])
}
