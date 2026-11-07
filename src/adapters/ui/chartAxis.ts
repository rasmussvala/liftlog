// The progress chart's geometry and its dated vertical gridlines. Days are day numbers (see domain/progressChart.ts).
import { MONTHS } from './format'

// Drawing size in SVG units. The SVG scales to the screen's width. The right padding holds the kg values.
export const W = 350
export const H = 200
export const PAD = { top: 10, right: 38, bottom: 22, left: 4 }
export const PLOT_W = W - PAD.left - PAD.right
export const BASELINE = H - PAD.bottom

// The x of a day number in a window, in SVG units.
export const plotX = (day: number, window: { start: number; end: number }) =>
  PAD.left + ((day - window.start) / (window.end - window.start)) * PLOT_W

const DAY_MS = 86_400_000

export interface XTick {
  day: number
  label: string
}

// A day number as a UTC date, which is the calendar date it stands for.
const asDate = (day: number) => new Date(day * DAY_MS)
const asDay = (date: Date) => date.getTime() / DAY_MS

// Gridlines from start to end. How dense depends on the window's length, which is animated,
// so labels never crowd mid-zoom: Mondays up to 45 days, months up to 200, month initials up to 400,
// then quarters, then years once the window is over about 2.5 years.
export function xTicks(start: number, end: number): XTick[] {
  const length = end - start
  const ticks: XTick[] = []
  if (length <= 45) {
    // Day 0 (1 Jan 1970) was a Thursday, so Mondays are 4 more than a multiple of 7.
    for (let day = Math.ceil((start - 4) / 7) * 7 + 4; day <= end; day += 7) {
      const date = asDate(day)
      ticks.push({ day, label: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}` })
    }
    return ticks
  }
  const everyMonths = length <= 400 ? 1 : length <= 912 ? 3 : 12
  const label = (month: number, year: number) => {
    if (everyMonths === 12 || (everyMonths === 3 && month === 0)) return String(year)
    return length <= 200 || everyMonths === 3 ? MONTHS[month] : MONTHS[month][0]
  }
  const first = asDate(Math.floor(start))
  const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1))
  if (asDay(date) < start) date.setUTCMonth(date.getUTCMonth() + 1)
  for (; asDay(date) <= end; date.setUTCMonth(date.getUTCMonth() + 1)) {
    if (date.getUTCMonth() % everyMonths === 0) {
      ticks.push({ day: asDay(date), label: label(date.getUTCMonth(), date.getUTCFullYear()) })
    }
  }
  return ticks
}
