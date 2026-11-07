// The exercise screen's progress chart, after Apple Health's Cardio Fitness chart: a Range control,
// a fixed header, and Entries as hollow dots on a line, with gridlines.
// Tap picks the nearest Entry; hold then slide scrubs; swipe sideways to go back or forward one period;
// up/down scrolls the page. Panning, zooming between Ranges and rescaling the y-axis all run on springs,
// so any of them can be grabbed mid-flight. Tapping anywhere outside the chart clears the picked Entry.
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Day, Entry } from '../../domain/entry'
import { chartModel, chartPoints, openingRange, rangeLength, RANGES, windowAt, type ChartModel, type ChartPoint, type ChartScale, type Range } from '../../domain/progressChart'
import { plotX, PLOT_W, W } from './chartAxis'
import { ChartPlot } from './ChartPlot'
import { useChartGesture, useSpring } from './chartMotion'
import { dayLabel, formatChange, formatEstimate, formatWeight } from './format'
import { Kg } from './Kg'
import { project, rubberband } from './physics'
import { rememberedRange, rememberRange } from './rangePreference'
import { SegmentedControl } from './SegmentedControl'

const SEGMENTS = RANGES.map((range) => ({ id: range, label: range }))
// Gridlines for a chart with no Entries at all. They're drawn without values. Three gaps, so the
// empty-chart message sits between two lines rather than on one.
const EMPTY_SCALE: ChartScale = { lo: 0, hi: 30, ticks: [0, 10, 20, 30] }
// Spring responses, in seconds.
const PAN_RESPONSE = 0.35
const ZOOM_RESPONSE = 0.4
const SCALE_RESPONSE = 0.35

// Shown for any number of Entries. Entries may come in any order.
export function ProgressChart({ entries, today }: { entries: readonly Entry[]; today: Day }) {
  const [range, setRange] = useState<Range>(() => rememberedRange() ?? openingRange(entries, today))
  // The period the chart is on, or sliding to (0 = the current one). Changes on release, not mid-drag,
  // so the header and y-axis hold still while the finger is down.
  const [chosenOffset, setOffset] = useState(0)
  const [pickedDay, setPickedDay] = useState<Day>()
  const svg = useRef<SVGSVGElement>(null)

  const length = rangeLength(range, entries, today)
  // A deleted Entry can leave the chosen period beyond the history.
  const { maxOffset } = chartModel(entries, today, range, 0)
  const offset = Math.min(chosenOffset, maxOffset)
  const model = chartModel(entries, today, range, offset)
  const points = chartPoints(entries)
  const picked = points.find((p) => p.day === pickedDay)

  // The window's length in days, and how many days it's shifted back from the current period.
  const span = useSpring(length, ZOOM_RESPONSE)
  const shift = useSpring(0, PAN_RESPONSE)
  const { to: spanTo } = span
  useEffect(() => spanTo(length), [length, spanTo])

  // When a deleted Entry shortens the history, slide back onto the last period that still exists.
  const { to: shiftTo, live: shiftLive } = shift
  useEffect(() => {
    if (shiftLive.current.value > maxOffset * length) shiftTo(maxOffset * length)
  }, [maxOffset, length, shiftLive, shiftTo])

  const scale = useYScale(model, entries, today)
  const { start, end } = windowAt(today, span.value, shift.value)

  useClearOnOutsideTouch(svg, pickedDay !== undefined, () => setPickedDay(undefined))

  // The finger's position when a pan started, in days shifted back.
  const grabbedAt = useRef(0)
  // The slide's speed when a touch caught it, so a tap lets it carry on rather than restart from rest.
  const caughtVelocity = useRef(0)
  const handlers = useChartGesture(svg, W, {
    onDown: () => {
      caughtVelocity.current = shift.live.current.velocity
      shift.jump(shift.live.current.value)
    },
    onPanStart: () => {
      grabbedAt.current = shift.live.current.value
      setPickedDay(undefined)
    },
    onPan: (dx) => {
      // Finger right = further back in time. Past today or the first Entry, it resists.
      const days = grabbedAt.current + (dx / PLOT_W) * span.value
      const max = maxOffset * length
      if (days < 0) shift.jump(rubberband(days, length))
      else if (days > max) shift.jump(max + rubberband(days - max, length))
      else shift.jump(days)
    },
    onPanEnd: (velocity) => {
      // Land where the flick was heading, at most one period away, then spring there at the finger's speed.
      const daysPerSecond = (velocity / PLOT_W) * span.value
      const landing = Math.round((shift.live.current.value + project(daysPerSecond)) / length)
      const next = Math.max(0, Math.min(landing, offset + 1, maxOffset), offset - 1)
      setOffset(next)
      shift.to(next * length, daysPerSecond)
    },
    onSettle: () => shift.to(offset * length, caughtVelocity.current),
    onPick: (clientX) => setPickedDay(nearest(points, clientX, svg.current!, { start, end })?.day),
  })

  const pickRange = (next: Range) => {
    rememberRange(next)
    setRange(next)
    setOffset(0)
    setPickedDay(undefined)
    shift.to(0)
  }

  return (
    <div className="mt-2 px-5">
      <SegmentedControl segments={SEGMENTS} selected={range} onSelect={pickRange} label="Range" />
      <ChartHeader model={model} picked={picked} today={today} />
      <ChartPlot
        svgRef={svg}
        role="img"
        aria-label={summary(model, today)}
        start={start}
        end={end}
        lo={scale.lo}
        hi={scale.hi}
        ticks={scale.ticks}
        entries={points}
        picked={picked}
        {...handlers}
      />
    </div>
  )
}

// The y-axis, springing to the destination period's scale. An empty period keeps the last scale.
function useYScale(model: ChartModel, entries: readonly Entry[], today: Day) {
  const [settled, setSettled] = useState(() => model.scale ?? chartModel(entries, today, 'All', 0).scale ?? EMPTY_SCALE)
  if (model.scale && model.scale.ticks.join() !== settled.ticks.join()) setSettled(model.scale)
  const lo = useSpring(settled.lo, SCALE_RESPONSE)
  const hi = useSpring(settled.hi, SCALE_RESPONSE)
  const { to: loTo } = lo
  const { to: hiTo } = hi
  useEffect(() => loTo(settled.lo), [settled.lo, loTo])
  useEffect(() => hiTo(settled.hi), [settled.hi, hiTo])
  return { lo: lo.value, hi: hi.value, ticks: settled.ticks }
}

// Any touch outside the chart clears the picked Entry.
function useClearOnOutsideTouch(svg: RefObject<SVGSVGElement | null>, active: boolean, clear: () => void) {
  const latest = useRef(clear)
  useEffect(() => {
    latest.current = clear
  })
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent) => {
      if (!svg.current?.contains(e.target as Node)) latest.current()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [svg, active])
}

// The Entry in the window nearest a screen x, by x only.
function nearest(points: readonly ChartPoint[], clientX: number, svg: SVGSVGElement, window: { start: number; end: number }) {
  const rect = svg.getBoundingClientRect()
  const fingerX = ((clientX - rect.left) / rect.width) * W
  const distance = (p: ChartPoint) => Math.abs(plotX(p.dayNumber, window) - fingerX)
  return points
    .filter((p) => p.dayNumber > window.start && p.dayNumber <= window.end)
    .reduce<ChartPoint | undefined>((a, b) => (!a || distance(b) < distance(a) ? b : a), undefined)
}

// "24 May – Today"
const dates = (model: ChartModel, today: Day) => `${dayLabel(model.headerStart, today)} – ${dayLabel(model.headerEnd, today)}`

// Three fixed lines above the plot. At rest: Best, the highest Estimated 1RM, and the dates with the change.
// While an Entry is picked: weight × reps, its Estimated 1RM, its day. The chart's label says the same to VoiceOver.
function ChartHeader({ model, picked, today }: { model: ChartModel; picked: ChartPoint | undefined; today: Day }) {
  const value = picked?.estimated1RM ?? model.best
  const change = model.change === undefined ? '' : `, ${formatChange(model.change).text} kg`
  return (
    <div aria-hidden className="mt-4 tabular-nums whitespace-nowrap">
      <p className="text-footnote text-label-secondary">{picked ? `${formatWeight(picked.weightKg)} × ${picked.reps}` : 'Best'}</p>
      <p className="text-large-title">
        {value === undefined ? '–' : formatEstimate(value)}
        {value !== undefined && <Kg />}
      </p>
      <p className="truncate text-footnote text-label-secondary">
        {picked ? dayLabel(picked.day, today) : `${dates(model, today)}${change}`}
      </p>
    </div>
  )
}

// What VoiceOver reads for the chart: "Best 120.3 kg, 24 May to today, up 11.7 kg".
function summary(model: ChartModel, today: Day) {
  const lower = (label: string) => (label === 'Today' ? 'today' : label)
  const period = `${lower(dayLabel(model.headerStart, today))} to ${lower(dayLabel(model.headerEnd, today))}`
  if (model.best === undefined) return `No entries, ${period}`
  const best = `Best ${formatEstimate(model.best)} kg, ${period}`
  if (model.change === undefined) return best
  const rounded = Math.round(model.change * 10) / 10
  if (rounded === 0) return `${best}, no change`
  return `${best}, ${rounded > 0 ? 'up' : 'down'} ${Math.abs(rounded).toFixed(1)} kg`
}
