// Springs and the one-finger gesture for the progress chart.
import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { spring, VelocityTracker } from './physics'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The physics spring stops within 0.3 of its target, which suits pixels. Days and kg need finer steps,
// so values spring in hundredths.
const PRECISION = 100

// A number that springs to new targets. Interrupting starts from the live value and keeps its velocity.
// Under reduced motion it jumps straight to the target.
export function useSpring(initial: number, response: number) {
  const [value, setValue] = useState(initial)
  const live = useRef({ value: initial, velocity: 0 })
  const stop = useRef<() => void>(undefined)

  const jump = useCallback((target: number) => {
    stop.current?.()
    live.current = { value: target, velocity: 0 }
    setValue(target)
  }, [])

  const to = useCallback(
    (target: number, velocity = live.current.velocity) => {
      stop.current?.()
      if (reducedMotion()) return jump(target)
      if (live.current.value === target && velocity === 0) return
      stop.current = spring({
        from: live.current.value * PRECISION,
        to: target * PRECISION,
        velocity: velocity * PRECISION,
        response,
        onFrame: (v, speed) => {
          live.current = { value: v / PRECISION, velocity: speed / PRECISION }
          setValue(v / PRECISION)
        },
      })
    },
    [jump, response],
  )

  useEffect(() => () => stop.current?.(), [])
  return { value, live, jump, to }
}

type Mode = 'idle' | 'pending' | 'pan' | 'scrub' | 'scroll'
// Hold this long without moving to start scrubbing, like Health.
const HOLD_MS = 180
// Move this far before deciding between a pan and a page scroll.
const SLOP_PX = 8

export interface ChartGestureHandlers {
  // Touch-down: catch anything still moving, so it can be grabbed mid-flight.
  onDown: () => void
  onPanStart: () => void
  // Sideways distance from touch-down, in SVG units.
  onPan: (dx: number) => void
  // Release velocity, in SVG units per second.
  onPanEnd: (velocity: number) => void
  // Pick the Entry nearest this screen x.
  onPick: (clientX: number) => void
  // A touch that ended without panning: send anything caught mid-flight on to where it was going.
  onSettle: () => void
}

// One finger on the chart means one of four things, decided from the first touch:
// released early is a tap that picks the nearest Entry, a hold then slide scrubs,
// a sideways drag pans, and an up/down drag is left to the page so it scrolls.
export function useChartGesture(svg: RefObject<SVGSVGElement | null>, width: number, handlers: ChartGestureHandlers) {
  const mode = useRef<Mode>('idle')
  const start = useRef({ x: 0, y: 0 })
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tracker = useRef(new VelocityTracker())
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  // While panning or scrubbing, stop the page from also scrolling. React's touch listeners are passive.
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const block = (e: TouchEvent) => {
      if (mode.current === 'pan' || mode.current === 'scrub') e.preventDefault()
    }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [svg])

  useEffect(() => () => clearTimeout(hold.current), [])

  const units = (px: number) => (px * width) / svg.current!.getBoundingClientRect().width
  const end = (velocity: number) => {
    clearTimeout(hold.current)
    if (mode.current === 'pan') latest.current.onPanEnd(velocity)
    else latest.current.onSettle()
    mode.current = 'idle'
  }

  return {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      mode.current = 'pending'
      latest.current.onDown()
      start.current = { x: e.clientX, y: e.clientY }
      const target = e.currentTarget
      const id = e.pointerId
      clearTimeout(hold.current)
      hold.current = setTimeout(() => {
        if (mode.current !== 'pending') return
        mode.current = 'scrub'
        target.setPointerCapture(id)
        latest.current.onPick(start.current.x)
      }, HOLD_MS)
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      if (mode.current === 'pending') {
        if (Math.abs(dx) > SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
          clearTimeout(hold.current)
          mode.current = 'pan'
          e.currentTarget.setPointerCapture(e.pointerId)
          tracker.current = new VelocityTracker()
          latest.current.onPanStart()
        } else if (Math.abs(dy) > SLOP_PX) {
          clearTimeout(hold.current)
          mode.current = 'scroll'
        }
      }
      if (mode.current === 'pan') {
        // Measured from touch-down, so the chart stays under the finger with no jump at the slop.
        tracker.current.add(units(dx), e.timeStamp)
        latest.current.onPan(units(dx))
      }
      if (mode.current === 'scrub') latest.current.onPick(e.clientX)
    },
    onPointerUp: (e: PointerEvent<SVGSVGElement>) => {
      if (mode.current === 'pending') latest.current.onPick(start.current.x)
      // A sample at release, so a drag that stopped before lifting lets go at rest instead of flicking.
      if (mode.current === 'pan') tracker.current.add(units(e.clientX - start.current.x), e.timeStamp)
      end(tracker.current.get())
    },
    onPointerCancel: () => end(0),
  }
}
