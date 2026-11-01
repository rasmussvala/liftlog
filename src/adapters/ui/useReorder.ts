import { flushSync } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { rubberband, spring, VelocityTracker } from './physics'

const HOLD_MS = 400
const SLOP = 10
const EDGE_SIZE = 90
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Position {
  top: number
  height: number
}

interface PendingDrag {
  id: number
  pointerId: number
  target: HTMLElement
  startX: number
  startY: number
  currentY: number
  grabbedDocY: number
  grabOffset: number
  timer: number
  positions?: Map<number, Position>
  initialOrder?: number[]
  sourceIndex?: number
  targetIndex?: number
  scrollFrame?: number
  stopSpring?: () => void
  scale: number
  offset: number
  velocity: VelocityTracker
}

function paintDisplacement(rows: Map<number, HTMLLIElement>, current: PendingDrag, delta: number) {
  const positions = current.positions
  const initialOrder = current.initialOrder
  if (!positions || !initialOrder || current.sourceIndex === undefined || current.targetIndex === undefined) return
  const source = current.sourceIndex
  const target = current.targetIndex
  for (let index = 0; index < initialOrder.length; index++) {
    const id = initialOrder[index]
    const row = rows.get(id)
    const position = positions.get(id)
    if (!row || !position) continue
    if (id === current.id) {
      row.dataset.dragOffset = String(delta)
      current.offset = delta
      row.style.transition = 'none'
      row.style.zIndex = '2'
      const reduce = prefersReducedMotion()
      row.style.transform = `translateY(${delta}px)${reduce ? '' : ` scale(${current.scale})`}`
      continue
    }
    const shiftsUp = source < target && index > source && index <= target
    const shiftsDown = source > target && index >= target && index < source
    if (!shiftsUp && !shiftsDown) {
      row.style.transform = ''
      continue
    }
    const neighbor = initialOrder[index + (shiftsUp ? -1 : 1)]
    const neighborTop = positions.get(neighbor)?.top
    const offset = neighborTop === undefined ? 0 : neighborTop - position.top
    row.style.transition = prefersReducedMotion()
      ? 'none'
      : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)'
    row.style.transform = `translateY(${offset}px)`
  }
}

function clearRowOffsets(rows: Map<number, HTMLLIElement>) {
  for (const row of rows.values()) {
    row.style.transform = ''
    row.style.transition = ''
    row.style.zIndex = ''
    row.style.boxShadow = ''
  }
}

const sameIds = (left: number[], right: number[]) => left.length === right.length && left.every((id, index) => id === right[index])

function setRowRef(rows: Map<number, HTMLLIElement>, id: number, row: HTMLLIElement | null) {
  if (row) rows.set(id, row)
  else rows.delete(id)
}

function preventContextMenu(drag: { current: PendingDrag | undefined }, event: React.MouseEvent) {
  if (drag.current) event.preventDefault()
}

function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

// Long-press reordering shared by every Home row. DOM offsets keep the lifted row
// and its placeholder in one frame while React commits the new keyed order.
export function useReorder(ids: number[], onMove: (id: number, toIndex: number) => void) {
  const [orderOverride, setOrderOverride] = useState<{ sourceIds: number[]; order: number[] }>()
  const order = orderOverride && sameIds(ids, orderOverride.sourceIds) ? orderOverride.order : ids
  const [draggingId, setDraggingId] = useState<number>()
  const orderRef = useRef(order)
  const callbacks = useLatest(onMove)
  const rows = useRef(new Map<number, HTMLLIElement>())
  const drag = useRef<PendingDrag | undefined>(undefined)

  useLayoutEffect(() => {
    orderRef.current = order
  }, [order])

  const clearOffsets = useCallback(() => clearRowOffsets(rows.current), [])

  const registerRow = useCallback((id: number, row: HTMLLIElement | null) => setRowRef(rows.current, id, row), [])

  const stopDrag = useCallback((commit: boolean) => {
    const current = drag.current
    if (!current) return
    window.clearTimeout(current.timer)
    if (current.scrollFrame) cancelAnimationFrame(current.scrollFrame)
    if (!current.positions || !current.initialOrder || current.sourceIndex === undefined || current.targetIndex === undefined) {
      drag.current = undefined
      return
    }

    const from = current.sourceIndex
    const to = current.targetIndex
    const slotTop = (index: number) => current.positions?.get(current.initialOrder?.[index] ?? -1)?.top ?? 0
    const destination = slotTop(to) - slotTop(from)
    const reducedMotion = prefersReducedMotion()
    current.stopSpring?.()
    if (!commit) {
      clearOffsets()
      drag.current = undefined
      setDraggingId(undefined)
      return
    }

    let animations = reducedMotion || from === to ? 0 : 2
    const finish = () => {
      if (animations > 0 && --animations > 0) return
      const next = [...(current.initialOrder ?? [])]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      flushSync(() => {
        orderRef.current = next
        setOrderOverride({ sourceIds: current.initialOrder ?? [], order: next })
        setDraggingId(undefined)
      })
      clearOffsets()
      drag.current = undefined
      if (moved !== undefined && from !== to) callbacks.current(moved, to)
    }

    if (reducedMotion) {
      finish()
      return
    }
    const picked = rows.current.get(current.id)
    const delta = (Number.parseFloat(picked?.dataset.dragOffset ?? '0') || 0)
    const releaseVelocity = current.velocity.get()
    const stopPosition = spring({
      from: delta,
      to: destination,
      velocity: releaseVelocity,
      response: 0.34,
      onFrame: (value) => {
        current.offset = value
        if (picked) picked.style.transform = `translateY(${value}px) scale(${current.scale})`
      },
      onDone: finish,
    })
    const stopScale = spring({
      from: current.scale,
      to: 1,
      velocity: 0,
      response: 0.22,
      onFrame: (value) => {
        current.scale = value
        if (picked) picked.style.transform = `translateY(${current.offset}px) scale(${value})`
      },
      onDone: finish,
    })
    current.stopSpring = () => {
      stopPosition()
      stopScale()
    }
  }, [callbacks, clearOffsets])

  const beginDrag = useCallback((current: PendingDrag) => {
    const initialOrder = [...orderRef.current]
    const positions = new Map<number, Position>()
    for (const id of initialOrder) {
      const row = rows.current.get(id)
      if (!row) continue
      const rect = row.getBoundingClientRect()
      positions.set(id, { top: rect.top + (window.scrollY || 0), height: rect.height })
    }
    current.positions = positions
    current.initialOrder = initialOrder
    current.sourceIndex = initialOrder.indexOf(current.id)
    current.targetIndex = current.sourceIndex
    current.target.setPointerCapture(current.pointerId)
    current.velocity.add(current.currentY, performance.now())
    flushSync(() => setDraggingId(current.id))
    if ('vibrate' in navigator) navigator.vibrate(10)
    paintDisplacement(rows.current, current, 0)
    if (!prefersReducedMotion()) {
      const picked = rows.current.get(current.id)
      current.stopSpring = spring({
        from: 1,
        to: 1.03,
        velocity: 0,
        response: 0.22,
        onFrame: (value) => {
          current.scale = value
          if (picked) {
            picked.style.transform = `translateY(${current.offset}px) scale(${value})`
            picked.style.boxShadow = `0 12px 24px color-mix(in srgb, var(--color-label) ${Math.round((value - 1) * 600)}%, transparent)`
          }
        },
      })
    }
    const autoScroll = () => {
      const y = current.currentY
      const distanceTop = y
      const distanceBottom = window.innerHeight - y
      if (distanceTop < EDGE_SIZE) window.scrollBy(0, -Math.ceil((EDGE_SIZE - distanceTop) / 7))
      else if (distanceBottom < EDGE_SIZE) window.scrollBy(0, Math.ceil((EDGE_SIZE - distanceBottom) / 7))
      current.scrollFrame = requestAnimationFrame(autoScroll)
    }
    current.scrollFrame = requestAnimationFrame(autoScroll)
  }, [])

  const pointerDown = useCallback((id: number, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    const row = rows.current.get(id)
    if (!row) return
    const rect = row.getBoundingClientRect()
    const current: PendingDrag = {
      id,
      pointerId: event.pointerId,
      target: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      currentY: event.clientY,
      grabbedDocY: event.clientY + (window.scrollY || 0),
      grabOffset: event.clientY - rect.top,
      timer: 0,
      scale: 1,
      offset: 0,
      velocity: new VelocityTracker(),
    }
    current.velocity.add(event.clientY, event.timeStamp)
    current.timer = window.setTimeout(() => beginDrag(current), HOLD_MS)
    drag.current = current
  }, [beginDrag])

  const pointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return false
    const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY)
    if (!current.positions && distance > SLOP) {
      window.clearTimeout(current.timer)
      drag.current = undefined
      return false
    }
    if (!current.positions || !current.initialOrder || current.sourceIndex === undefined) return false
    event.preventDefault()
    current.currentY = event.clientY
    const contentY = event.clientY + (window.scrollY || 0)
    const centers = current.initialOrder.map((id) => {
      const position = current.positions?.get(id)
      return position ? position.top + position.height / 2 : 0
    })
    const originalMiddle = (current.positions.get(current.id)?.top ?? 0) + (current.positions.get(current.id)?.height ?? 0) / 2
    const rawMiddle = contentY - current.grabOffset + (current.positions.get(current.id)?.height ?? 0) / 2
    const firstCenter = centers[0] ?? rawMiddle
    const lastCenter = centers.at(-1) ?? rawMiddle
    const draggedMiddle = rawMiddle < firstCenter
      ? firstCenter - rubberband(firstCenter - rawMiddle, window.innerHeight)
      : rawMiddle > lastCenter
        ? lastCenter + rubberband(rawMiddle - lastCenter, window.innerHeight)
        : rawMiddle
    let target = 0
    while (target < centers.length - 1 && draggedMiddle > ((centers[target] + centers[target + 1]) / 2)) target++
    current.targetIndex = target
    current.velocity.add(event.clientY, event.timeStamp)
    paintDisplacement(rows.current, current, draggedMiddle - originalMiddle)
    return true
  }, [])

  const pointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return false
    if (current.positions) {
      stopDrag(true)
      return true
    }
    window.clearTimeout(current.timer)
    drag.current = undefined
    return false
  }, [stopDrag])

  const cancelPointer = useCallback(() => stopDrag(false), [stopDrag])
  const onContextMenu = useCallback((event: React.MouseEvent) => preventContextMenu(drag, event), [])

  useEffect(() => () => stopDrag(false), [stopDrag])

  return { order, draggingId, registerRow, pointerDown, pointerMove, pointerUp, cancelPointer, onContextMenu }
}
