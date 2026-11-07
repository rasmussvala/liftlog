// The progress chart's drawing: gridlines, dated labels, the line and the dots, as plain SVG.
// Knows nothing about gestures or springs: it draws whatever window and scale it's given.
import { useEffect, useId, useRef, useState, type ComponentProps, type Ref } from 'react'
import type { ChartPoint } from '../../domain/progressChart'
import { BASELINE, H, PAD, plotX, PLOT_W, W, xTicks } from './chartAxis'
import { formatWeight } from './format'

// How long a gridline takes to fade in or out when the y-axis rescales (matches duration-300).
const FADE_MS = 300

interface ChartPlotProps extends Omit<ComponentProps<'svg'>, 'ref'> {
  svgRef: Ref<SVGSVGElement>
  // The window drawn, as day numbers, and the y-axis's live bottom and top. All may be mid-animation.
  start: number
  end: number
  lo: number
  hi: number
  // The y-axis's settled gridlines.
  ticks: readonly number[]
  // Every Entry, oldest first. The plot clips them to the window.
  entries: readonly ChartPoint[]
  picked: ChartPoint | undefined
}

export function ChartPlot({ svgRef, start, end, lo, hi, ticks, entries, picked, ...svgProps }: ChartPlotProps) {
  const clip = useId()
  const x = (day: number) => plotX(day, { start, end })
  const y = (kg: number) => PAD.top + (1 - (kg - lo) / (hi - lo)) * (BASELINE - PAD.top)
  const gridlines = useFadingTicks(ticks)
  const dates = xTicks(start, end)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-pan-y overflow-visible text-tint select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
      {...svgProps}
    >
      <defs>
        <clipPath id={clip}>
          <rect x={PAD.left} y={0} width={PLOT_W} height={H} />
        </clipPath>
      </defs>
      {gridlines.map(({ kg, leaving }) => {
        // Mid-rescale a gridline can sit outside the plot: hide it there, and fade it near the edges.
        const ly = y(kg)
        const edge = Math.min(1, Math.max(0, (ly - PAD.top + 8) / 8), Math.max(0, (BASELINE - ly + 8) / 8))
        if (edge === 0) return null
        return (
          <g key={kg} opacity={edge}>
            <g className={`transition-opacity duration-300 ease-out starting:opacity-0 ${leaving ? 'opacity-0' : ''}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={ly} y2={ly} className="stroke-separator" strokeWidth={1} />
              <text x={W - PAD.right + 6} y={ly + 4} className="fill-label-secondary text-footnote">
                {/* No Entries: the gridlines frame an empty chart, with no values to label yet. */}
                {entries.length ? formatWeight(kg) : ''}
              </text>
            </g>
          </g>
        )
      })}
      {/* Whole labels or none: each fades out as its gridline nears either edge. */}
      {dates.map(({ day, label }) => {
        const lx = x(day)
        const fade = Math.min(1, Math.max(0, (lx - PAD.left) / 12), Math.max(0, (W - PAD.right - 24 - lx) / 12))
        return (
          <text key={day} x={lx + 3} y={H - 4} opacity={fade} className="fill-label-secondary text-footnote">
            {label}
          </text>
        )
      })}
      <g clipPath={`url(#${clip})`}>
        {dates.map(({ day }) => (
          <line
            key={day}
            x1={x(day)}
            x2={x(day)}
            y1={PAD.top}
            y2={BASELINE + 4}
            className="stroke-separator"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        ))}
        {picked && (
          <line
            x1={x(picked.dayNumber)}
            x2={x(picked.dayNumber)}
            y1={PAD.top}
            y2={BASELINE}
            className="stroke-label-secondary"
            strokeWidth={1}
          />
        )}
        {!entries.length && (
          <text x={PAD.left + PLOT_W / 2} y={(PAD.top + BASELINE) / 2 + 5} textAnchor="middle" className="fill-label-secondary text-subhead">
            Your sets will show up here
          </text>
        )}
        <polyline
          points={entries.map((p) => `${x(p.dayNumber)},${y(p.estimated1RM)}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {entries.map((p) => {
          const cx = x(p.dayNumber)
          const cy = y(p.estimated1RM)
          return (
            <circle
              key={p.day}
              cx={cx}
              cy={cy}
              r={3.5}
              // A hollow ring that grows from its own centre when picked, and shrinks back when let go.
              style={{ transformOrigin: `${cx}px ${cy}px`, transform: p.day === picked?.day ? 'scale(1.7)' : 'none' }}
              className="fill-bg stroke-tint motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
              strokeWidth={2}
            />
          )
        })}
      </g>
    </svg>
  )
}

// The gridlines to draw: the current ones (which fade in as they appear), plus any that just left,
// fading out, so a rescale cross-fades rather than pops.
function useFadingTicks(ticks: readonly number[]) {
  const [leaving, setLeaving] = useState<number[]>([])
  const shown = useRef(ticks)
  const key = ticks.join()
  useEffect(() => {
    const gone = shown.current.filter((kg) => !ticks.includes(kg))
    shown.current = ticks
    if (!gone.length) return
    setLeaving(gone)
    const timer = setTimeout(() => setLeaving([]), FADE_MS)
    return () => clearTimeout(timer)
    // Keyed on the values, not the array, which is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return [
    ...ticks.map((kg) => ({ kg, leaving: false })),
    ...leaving.filter((kg) => !ticks.includes(kg)).map((kg) => ({ kg, leaving: true })),
  ]
}
