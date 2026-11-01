// The exercise screen's progress chart: every entry's estimated 1RM over real time, drawn as plain SVG.
// Tap a point, or press and slide along the chart, to read one entry in a callout above it.
// Vertical swipes still scroll the page (touch-pan-y). Tapping anywhere outside the chart hides the callout.
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import type { Day, Entry } from '../../domain/entry'
import { progress } from '../../domain/progress'
import { dayLabel, formatEstimate, formatWeight } from './format'
import { Kg } from './Kg'

// Drawing size in SVG units. The SVG scales to the screen's width.
const W = 350
const H = 170
const PAD = { top: 20, right: 16, bottom: 26, left: 16 }
// Share of the data's range added above and below, so points don't touch the edges.
const Y_PADDING = 0.15

const time = (day: Day) => new Date(`${day}T12:00:00`).getTime()

// Hidden with fewer than 2 entries. Entries may come in any order.
export function ProgressChart({ entries, today }: { entries: readonly Entry[]; today: Day }) {
  const [selected, setSelected] = useState<number>()
  const svg = useRef<SVGSVGElement>(null)
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

  if (entries.length < 2) return null

  const byDay = new Map(entries.map((entry) => [entry.day, entry]))
  const points = progress(entries).map((p) => ({ ...p, entry: byDay.get(p.day)! }))
  const first = points[0]
  const last = points.at(-1)!

  const t0 = time(first.day)
  const span = time(last.day) - t0 || 1
  const estimates = points.map((p) => p.estimated1RM)
  const lo = Math.min(...estimates)
  const hi = Math.max(...estimates)
  const pad = Math.max((hi - lo) * Y_PADDING, 1)
  const x = (day: Day) => PAD.left + ((time(day) - t0) / span) * (W - PAD.left - PAD.right)
  const y = (est: number) => PAD.top + (1 - (est - (lo - pad)) / (hi - lo + 2 * pad)) * (H - PAD.top - PAD.bottom)
  const xs = points.map((p) => x(p.day))

  const baseline = H - PAD.bottom
  const line = points.map((p, i) => `${xs[i]},${y(p.estimated1RM)}`).join(' ')
  const area = `M${xs[0]},${baseline} L${line.replaceAll(' ', ' L')} L${xs.at(-1)},${baseline} Z`
  const labels = [first, points[Math.floor(points.length / 2)], last]
  const hit = selected === undefined ? undefined : points[selected]

  // The point nearest the finger, by x only.
  const pick = (clientX: number) => {
    const rect = svg.current!.getBoundingClientRect()
    const fingerX = ((clientX - rect.left) / rect.width) * W
    let nearest = 0
    xs.forEach((px, i) => {
      if (Math.abs(px - fingerX) < Math.abs(xs[nearest] - fingerX)) nearest = i
    })
    setSelected(nearest)
  }
  const down = (e: PointerEvent<SVGSVGElement>) => {
    scrubbing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    pick(e.clientX)
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (scrubbing.current) pick(e.clientX)
  }
  const up = () => {
    scrubbing.current = false
  }

  // Where the selected point sits across the chart, 0–100%.
  const across = hit ? (xs[selected!] / W) * 100 : 0

  return (
    <div className="relative mt-4 px-5 pt-12">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Estimated 1RM over time"
        className="w-full touch-pan-y text-tint select-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${fillId})`} />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {hit && (
          <line x1={xs[selected!]} x2={xs[selected!]} y1={PAD.top - 8} y2={baseline} className="stroke-label-secondary/50" strokeWidth={1} />
        )}
        {points.map((p, i) => (
          <circle
            key={p.day}
            cx={xs[i]}
            cy={y(p.estimated1RM)}
            r={i === selected ? 6 : 3}
            fill="currentColor"
            className={i === selected ? 'stroke-bg' : ''}
            strokeWidth={2}
          />
        ))}
        {labels.map((p, i) => (
          <text
            key={i}
            x={x(p.day)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
            className="fill-label-secondary text-footnote"
          >
            {dayLabel(p.day, today)}
          </text>
        ))}
      </svg>
      {hit && (
        // Sits over its point, shifted by the same share of its own width so it never leaves the screen.
        <div className="pointer-events-none absolute inset-x-5 top-0">
          <div
            className="absolute top-0 flex origin-bottom items-baseline gap-2 rounded-control bg-surface-raised px-3 py-1.5 whitespace-nowrap tabular-nums shadow-md transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0"
            style={{ left: `${across}%`, translate: `-${across}% 0` }}
          >
            <span className="text-headline">
              {formatEstimate(hit.estimated1RM)}
              <Kg />
            </span>
            <span className="text-footnote text-label-secondary">
              {formatWeight(hit.entry.weightKg)} × {hit.entry.reps} · {dayLabel(hit.day, today)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
