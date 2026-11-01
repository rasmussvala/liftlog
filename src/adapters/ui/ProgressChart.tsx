// The exercise screen's progress chart: every entry's estimated 1RM over real time, drawn as plain SVG.
// Tap a point, or press and slide along the chart, to read one entry in a callout above it.
// Vertical swipes still scroll the page (touch-pan-y). Tapping anywhere outside the chart hides the callout.
import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import type { Day, Entry } from '../../domain/entry'
import { progress } from '../../domain/progress'
import { dayLabel, formatEstimate, formatWeight } from './format'
import { Kg } from './Kg'

// Drawing size in SVG units. The SVG scales to the screen's width.
const W = 350
const H = 170
const PAD = { top: 20, right: 16, bottom: 26, left: 16 }
// Share of the data's range added above and below, so points don't touch the edges.
const Y_MARGIN = 0.15
// The middle date label is left out when it's closer than this to either end, so labels never overlap.
const MIN_LABEL_GAP = W / 4

const time = (day: Day) => new Date(`${day}T12:00:00`).getTime()

// Hidden with fewer than 2 entries. Entries may come in any order.
export function ProgressChart({ entries, today }: { entries: readonly Entry[]; today: Day }) {
  const [selected, setSelected] = useState<number>()
  const svg = useRef<SVGSVGElement>(null)
  const callout = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const fillId = useId()

  // Any touch outside the chart hides the callout.
  useEffect(() => {
    if (selected === undefined) return
    const hide = (e: globalThis.PointerEvent) => {
      if (!svg.current?.contains(e.target as Node)) setSelected(undefined)
    }
    document.addEventListener('pointerdown', hide)
    return () => document.removeEventListener('pointerdown', hide)
  }, [selected])

  // Centre the callout over its point, but keep it inside the chart's width so it stays on screen.
  // Measured before paint, because the callout's width depends on its text.
  useLayoutEffect(() => {
    const box = callout.current
    if (!box || selected === undefined || !svg.current) return
    const chartWidth = svg.current.getBoundingClientRect().width
    const pointX = (Number(box.dataset.x) / W) * chartWidth
    const left = Math.min(Math.max(pointX - box.offsetWidth / 2, 0), chartWidth - box.offsetWidth)
    box.style.left = `${left}px`
  }, [selected])

  if (entries.length < 2) return null

  const byDay = new Map(entries.map((entry) => [entry.day, entry]))
  const points = progress(entries).map((p) => ({ ...p, entry: byDay.get(p.day)! }))

  const t0 = time(points[0].day)
  const span = time(points.at(-1)!.day) - t0 || 1
  const estimates = points.map((p) => p.estimated1RM)
  const lowest = Math.min(...estimates)
  const highest = Math.max(...estimates)
  const yMargin = Math.max((highest - lowest) * Y_MARGIN, 1)
  const x = (day: Day) => PAD.left + ((time(day) - t0) / span) * (W - PAD.left - PAD.right)
  const y = (est: number) =>
    PAD.top + (1 - (est - (lowest - yMargin)) / (highest - lowest + 2 * yMargin)) * (H - PAD.top - PAD.bottom)
  const plotted = points.map((p) => ({ ...p, x: x(p.day), y: y(p.estimated1RM) }))
  const first = plotted[0]
  const last = plotted.at(-1)!

  const baseline = H - PAD.bottom
  const line = plotted.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `M${first.x},${baseline} ${plotted.map((p) => `L${p.x},${p.y}`).join(' ')} L${last.x},${baseline} Z`

  // First, middle (the point nearest the middle in time) and last, each anchored so it stays inside the chart.
  const midX = (first.x + last.x) / 2
  const middle = plotted.reduce((a, b) => (Math.abs(b.x - midX) < Math.abs(a.x - midX) ? b : a))
  const middleFits = middle.x - first.x >= MIN_LABEL_GAP && last.x - middle.x >= MIN_LABEL_GAP
  const labels = [
    { point: first, anchor: 'start' as const },
    ...(middleFits ? [{ point: middle, anchor: 'middle' as const }] : []),
    { point: last, anchor: 'end' as const },
  ]

  const selectedPoint = selected === undefined ? undefined : plotted[selected]

  // The point nearest the finger, by x only.
  const pick = (clientX: number) => {
    const rect = svg.current!.getBoundingClientRect()
    const fingerX = ((clientX - rect.left) / rect.width) * W
    let nearest = 0
    plotted.forEach((p, i) => {
      if (Math.abs(p.x - fingerX) < Math.abs(plotted[nearest].x - fingerX)) nearest = i
    })
    setSelected(nearest)
  }
  const startScrub = (e: PointerEvent<SVGSVGElement>) => {
    scrubbing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    pick(e.clientX)
  }
  const scrub = (e: PointerEvent<SVGSVGElement>) => {
    if (scrubbing.current) pick(e.clientX)
  }
  const endScrub = () => {
    scrubbing.current = false
  }

  return (
    <div className="relative mt-4 px-5 pt-12">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Estimated 1RM over time"
        className="w-full touch-pan-y text-tint select-none"
        onPointerDown={startScrub}
        onPointerMove={scrub}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
      >
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${fillId})`} />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {selectedPoint && (
          <line
            x1={selectedPoint.x}
            x2={selectedPoint.x}
            y1={PAD.top - 8}
            y2={baseline}
            className="stroke-label-secondary/50"
            strokeWidth={1}
          />
        )}
        {plotted.map((p, i) => (
          <circle
            key={p.day}
            cx={p.x}
            cy={p.y}
            r={i === selected ? 6 : 3}
            fill="currentColor"
            className={i === selected ? 'stroke-bg' : ''}
            strokeWidth={2}
          />
        ))}
        {labels.map(({ point, anchor }) => (
          <text key={anchor} x={point.x} y={H - 6} textAnchor={anchor} className="fill-label-secondary text-footnote">
            {dayLabel(point.day, today)}
          </text>
        ))}
      </svg>
      {selectedPoint && (
        // Placed by the layout effect above. Scales in from its bottom edge, the side that points at the dot.
        <div className="pointer-events-none absolute inset-x-5 top-0">
          <div
            ref={callout}
            data-x={selectedPoint.x}
            className="absolute top-0 flex origin-bottom items-baseline gap-2 rounded-control bg-surface-raised px-3 py-1.5 whitespace-nowrap tabular-nums shadow-md transition-[opacity,scale] duration-150 ease-out starting:opacity-0 motion-safe:starting:scale-95"
          >
            <span className="text-headline">
              {formatEstimate(selectedPoint.estimated1RM)}
              <Kg />
            </span>
            <span className="text-footnote text-label-secondary">
              {formatWeight(selectedPoint.entry.weightKg)} × {selectedPoint.entry.reps} · {dayLabel(selectedPoint.day, today)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
