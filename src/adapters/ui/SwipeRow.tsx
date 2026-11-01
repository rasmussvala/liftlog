import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { project, rubberband, spring, VelocityTracker } from './physics'

const ACTIONS_WIDTH = 168
const SLOP = 10

type Gesture = 'idle' | 'pending' | 'swipe' | 'scroll'
interface OpenRow {
  close: () => void
}

let openRow: OpenRow | undefined
let swallowClicksUntil = 0
let outsideClickListener: ((event: MouseEvent) => void) | undefined
let outsideClickTimeout = 0

function swallowOutsideClick() {
  if (outsideClickListener) document.removeEventListener('click', outsideClickListener, true)
  window.clearTimeout(outsideClickTimeout)
  outsideClickListener = (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    if (outsideClickListener) document.removeEventListener('click', outsideClickListener, true)
    outsideClickListener = undefined
  }
  document.addEventListener('click', outsideClickListener, true)
  outsideClickTimeout = window.setTimeout(() => {
    if (outsideClickListener) document.removeEventListener('click', outsideClickListener, true)
    outsideClickListener = undefined
  }, 500)
}

interface SwipeRowProps {
  children: ReactNode
  label: string
  onTap: () => void
  onEdit: () => void
  onDelete: () => boolean
  onCollapsed: () => void
  collapsing: boolean
  flash: boolean
}

function RowActions({
  actions,
  label,
  isOpen,
  collapsing,
  close,
  onEdit,
  onDelete,
}: {
  actions: React.RefObject<HTMLDivElement | null>
  label: string
  isOpen: boolean
  collapsing: boolean
  close: () => void
  onEdit: () => void
  onDelete: () => boolean
}) {
  const unavailable = !isOpen || collapsing
  return (
    <div ref={actions} inert={unavailable} aria-hidden={unavailable} className="absolute inset-y-0 right-0 flex w-0 overflow-hidden">
      <button
        aria-label={`Edit ${label}`}
        onClick={() => {
          close()
          onEdit()
        }}
        className="min-w-0 flex-1 overflow-hidden bg-tint text-body whitespace-nowrap text-on-tint active:opacity-70"
      >
        Edit
      </button>
      <button
        aria-label={`Delete ${label}`}
        onClick={() => {
          if (!onDelete()) close()
        }}
        className="min-w-0 flex-1 overflow-hidden bg-destructive text-body whitespace-nowrap text-on-tint active:opacity-70"
      >
        Delete
      </button>
    </div>
  )
}

// A Home row that follows a sideways swipe and reveals explicit Edit and Delete actions.
export function SwipeRow({ children, label, onTap, onEdit, onDelete, onCollapsed, collapsing, flash }: SwipeRowProps) {
  const row = useRef<HTMLLIElement>(null)
  const content = useRef<HTMLButtonElement>(null)
  const actions = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onTap, onEdit, onDelete, onCollapsed })
  const state = useRef({
    offset: 0,
    gesture: 'idle' as Gesture,
    startX: 0,
    startY: 0,
    base: 0,
    captured: false,
    moved: false,
    timer: 0,
    stop: undefined as undefined | (() => void),
    velocity: new VelocityTracker(),
  })
  const [isOpen, setIsOpen] = useState(false)

  useLayoutEffect(() => {
    callbacks.current = { onTap, onEdit, onDelete, onCollapsed }
  })

  useEffect(() => {
    if (!flash) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    row.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' })
  }, [flash])

  const setOffset = (x: number) => {
    state.current.offset = x
    if (content.current) content.current.style.transform = x ? `translateX(${x}px)` : ''
    if (actions.current) actions.current.style.width = `${Math.max(0, -x)}px`
  }

  const settle = (target: number, velocity: number) => {
    const current = state.current
    current.stop?.()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOffset(target)
    } else {
      current.stop = spring({
        from: current.offset,
        to: target,
        velocity,
        response: 0.35,
        onFrame: setOffset,
      })
    }
    setIsOpen(target !== 0)
  }

  const close = useCallback(() => settle(0, 0), [])
  const self = useRef<OpenRow>({ close })
  useLayoutEffect(() => {
    self.current.close = close
  }, [close])

  useEffect(() => {
    if (!isOpen) return
    const thisRow = self.current
    if (openRow && openRow !== thisRow) openRow.close()
    openRow = thisRow

    const outsidePointer = (event: PointerEvent) => {
      if (row.current?.contains(event.target as Node)) return
      thisRow.close()
      swallowClicksUntil = performance.now() + 400
      swallowOutsideClick()
    }
    const scroll = () => {
      thisRow.close()
      swallowClicksUntil = performance.now() + 400
    }
    document.addEventListener('pointerdown', outsidePointer, true)
    window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      if (openRow === thisRow) openRow = undefined
      document.removeEventListener('pointerdown', outsidePointer, true)
      window.removeEventListener('scroll', scroll)
    }
  }, [isOpen])

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
          if (Math.hypot(dx, dy) > SLOP && Math.abs(dx) > Math.abs(dy)) {
            current.gesture = 'swipe'
            current.moved = true
            current.startX += Math.sign(dx) * SLOP
          }
        }
      }
      if (current.gesture === 'swipe') event.preventDefault()
    }
    element.addEventListener('touchmove', preventSwipeScroll, { passive: false })
    return () => element.removeEventListener('touchmove', preventSwipeScroll)
  }, [])

  useEffect(() => {
    const element = row.current
    if (!collapsing || !element) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
  }, [collapsing])

  const pointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    const current = state.current
    current.stop?.()
    Object.assign(current, {
      gesture: 'pending',
      startX: event.clientX,
      startY: event.clientY,
      base: current.offset,
      moved: false,
      captured: false,
    })
    current.velocity = new VelocityTracker()
    current.velocity.add(current.offset, event.timeStamp)
  }

  const pointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = state.current
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (current.gesture === 'pending' && Math.hypot(dx, dy) > SLOP) {
      current.moved = true
      if (Math.abs(dx) > Math.abs(dy)) {
        current.gesture = 'swipe'
        current.startX += Math.sign(dx) * SLOP
        event.currentTarget.setPointerCapture(event.pointerId)
        current.captured = true
      } else {
        current.gesture = 'scroll'
      }
    }
    if (current.gesture !== 'swipe') return
    if (!current.captured) {
      event.currentTarget.setPointerCapture(event.pointerId)
      current.captured = true
    }
    const raw = current.base + event.clientX - current.startX
    const width = content.current?.offsetWidth ?? 375
    const x = raw > 0 ? rubberband(raw, width) : raw < -ACTIONS_WIDTH ? -ACTIONS_WIDTH - rubberband(-ACTIONS_WIDTH - raw, width) : raw
    setOffset(x)
    current.velocity.add(x, event.timeStamp)
  }

  const pointerEnd = () => {
    const current = state.current
    if (current.gesture === 'swipe') {
      const velocity = current.velocity.get()
      const target = current.offset + project(velocity) < -ACTIONS_WIDTH / 2 ? -ACTIONS_WIDTH : 0
      settle(target, velocity)
    }
    current.gesture = 'idle'
  }

  const click = () => {
    const current = state.current
    if (current.moved || performance.now() < swallowClicksUntil) return
    if (current.offset !== 0) {
      self.current.close()
      return
    }
    callbacks.current.onTap()
  }

  return (
    <li ref={row} className="relative scroll-mb-[calc(env(safe-area-inset-bottom)+96px)] select-none will-change-transform [-webkit-touch-callout:none]">
      <RowActions
        actions={actions}
        label={label}
        isOpen={isOpen}
        collapsing={collapsing}
        close={() => self.current.close()}
        onEdit={() => callbacks.current.onEdit()}
        onDelete={() => callbacks.current.onDelete()}
      />
      <button
        ref={content}
        type="button"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onClick={click}
        className={`relative flex min-h-11 w-full touch-pan-y items-center gap-4 px-5 py-3 text-left transition-colors ease-out active:bg-surface-raised active:duration-0 ${flash ? 'bg-tint/15 duration-0' : 'bg-bg duration-700'}`}
      >
        <div className="min-w-0 flex-1">{children}</div>
      </button>
      <div aria-hidden className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-separator" />
    </li>
  )
}
