// The progress chart's model: which Entries a Range shows, the header's numbers and the y-axis scale.
// Everything apart from pixels and motion. `today` is always passed in.
import type { Day, Entry } from './entry'
import { progress } from './progress'

// The span of time the progress chart shows: a rolling window ending today.
export type Range = 'M' | '6M' | 'Y' | 'All'
export const RANGES: readonly Range[] = ['M', '6M', 'Y', 'All']

// Days in each rolling Range. All's length depends on the Entries.
export const RANGE_DAYS = { M: 30, '6M': 182, Y: 365 } as const

const DAY_MS = 86_400_000

// One Entry on the chart: what was lifted, its estimated 1RM, and its day as a day number for the x-axis.
export interface ChartPoint {
  day: Day
  dayNumber: number
  weightKg: number
  reps: number
  estimated1RM: number
}

// A Day as a whole number of days since 1970-01-01, so day arithmetic ignores time zones and DST.
export const dayNumber = (day: Day) => {
  const [year, month, date] = day.split('-').map(Number)
  return Date.UTC(year, month - 1, date) / DAY_MS
}

// The Day a day number falls on. Fractions round down.
export const dayFromNumber = (n: number): Day => new Date(Math.floor(n) * DAY_MS).toISOString().slice(0, 10)

// Every Entry as a chart point, oldest first. Entries may come in any order.
export function chartPoints(entries: readonly Entry[]): ChartPoint[] {
  const byDay = new Map(entries.map((e) => [e.day, e]))
  return progress(entries).map(({ day, estimated1RM }) => {
    const { weightKg, reps } = byDay.get(day)!
    return { day, dayNumber: dayNumber(day), weightKg, reps, estimated1RM }
  })
}

// The oldest and newest Day, as day numbers. Undefined with no Entries.
function span(entries: readonly Entry[]) {
  if (!entries.length) return undefined
  const days = entries.map((e) => dayNumber(e.day))
  return { first: Math.min(...days), last: Math.max(...days) }
}

// The Range the chart opens on, unless the user picked one: M while every Entry fits in a month,
// 6M when anything is that recent, else All, so the chart never opens squashed or blank.
export function openingRange(entries: readonly Entry[], today: Day): Range {
  const days = span(entries)
  if (!days) return 'M'
  const now = dayNumber(today)
  if (now - days.first <= (RANGE_DAYS.M * 11) / 12) return 'M'
  if (now - days.last <= (RANGE_DAYS['6M'] * 11) / 12) return '6M'
  return 'All'
}

// The window a Range covers, as day numbers: `length` days ending a twelfth of its length after today
// (empty room after the newest Entry), shifted back `shiftDays`. Fractional shifts are for animation.
export function windowAt(today: Day, length: number, shiftDays: number) {
  const end = dayNumber(today) + length / 12 - shiftDays
  return { start: end - length, end }
}

// Days a Range covers. All fits every Entry, with a little room before the first, once the
// twelfth of padding after today is taken off.
export function rangeLength(range: Range, entries: readonly Entry[], today: Day): number {
  if (range !== 'All') return RANGE_DAYS[range]
  const days = span(entries)
  const history = days ? dayNumber(today) - days.first : 0
  return Math.max(RANGE_DAYS.M, ((history * 1.03 + 2) * 12) / 11)
}

// The y-axis: gridlines at `ticks`, from `lo` at the bottom to `hi` at the top.
export interface ChartScale {
  lo: number
  hi: number
  ticks: number[]
}

// The axis never covers less than this, so a small change doesn't fill the chart and look like a cliff.
const MIN_SCALE_KG = 10
const MAX_GAPS = 4
// Round gridline steps, smallest first. The last few only matter for implausibly wide spreads.
const STEPS = [1, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]

// The smallest round step that fits the values in at most MAX_GAPS gaps. Not from zero.
function scaleFor(values: readonly number[]): ChartScale | undefined {
  if (!values.length) return undefined
  const pad = Math.max(0, MIN_SCALE_KG - (Math.max(...values) - Math.min(...values))) / 2
  const min = Math.min(...values) - pad
  const max = Math.max(...values) + pad
  const step = STEPS.find((s) => Math.ceil(max / s) - Math.floor(min / s) <= MAX_GAPS) ?? STEPS.at(-1)!
  const first = Math.floor(min / step)
  const last = Math.ceil(max / step)
  const ticks = Array.from({ length: last - first + 1 }, (_, i) => (first + i) * step)
  return { lo: ticks[0], hi: ticks.at(-1)!, ticks }
}

export interface ChartModel {
  // The window, as day numbers (see dayNumber): start is exclusive, end inclusive.
  start: number
  end: number
  // The Entries inside the window, oldest first.
  entries: ChartPoint[]
  // The highest estimated 1RM in the window. Undefined when it's empty.
  best: number | undefined
  // The last Entry's estimated 1RM minus the first's. Undefined with fewer than 2 Entries in the window.
  change: number | undefined
  // The dates the header shows: the window's first day, but never before the first Entry,
  // to its last day, but never after today.
  headerStart: Day
  headerEnd: Day
  // The y-axis for the Entries in the window. Undefined when it's empty: the chart keeps its last one.
  scale: ChartScale | undefined
  // The furthest period offset that can be swiped back to: the one holding the first Entry. 0 on All.
  maxOffset: number
}

// What the chart shows for a Range at a period offset (0 = the current period, 1 = the one before…).
export function chartModel(entries: readonly Entry[], today: Day, range: Range, offset: number): ChartModel {
  const length = rangeLength(range, entries, today)
  const { start, end } = windowAt(today, length, offset * length)
  const inside = chartPoints(entries).filter((p) => p.dayNumber > start && p.dayNumber <= end)
  const estimates = inside.map((p) => p.estimated1RM)
  const best = estimates.length ? Math.max(...estimates) : undefined
  const change = estimates.length >= 2 ? estimates.at(-1)! - estimates[0] : undefined
  const firstEntry = span(entries)?.first ?? -Infinity
  const headerStart = dayFromNumber(Math.max(Math.floor(start) + 1, firstEntry))
  const headerEnd = dayFromNumber(Math.min(end, dayNumber(today)))
  const scale = scaleFor(estimates)
  // Period n starts (n + 1 − 1/12) lengths before today, so it holds an Entry that many days back or fewer.
  const daysBack = dayNumber(today) - firstEntry
  const maxOffset = range === 'All' || !Number.isFinite(daysBack) ? 0 : Math.max(0, Math.floor(daysBack / length + 1 / 12))
  return { start, end, entries: inside, best, change, headerStart, headerEnd, scale, maxOffset }
}
