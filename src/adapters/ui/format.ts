// Display formatting for screens. Today's date comes from the local clock here, never from domain/.
import type { Day, RepsProblem, WeightProblem } from '../../domain/entry'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The user's local date as a Day ("2026-10-31").
export function localToday(now = new Date()): Day {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// "Today", else "17 Sep", plus the year when it isn't this year: "17 Sep 2025".
export function dayLabel(day: Day, today: Day): string {
  if (day === today) return 'Today'
  const [year, month, date] = day.split('-').map(Number)
  const yearSuffix = day.slice(0, 4) === today.slice(0, 4) ? '' : ` ${year}`
  return `${date} ${MONTHS[month - 1]}${yearSuffix}`
}

// Weights drop trailing zeros: 122.5, 100.
export const formatWeight = (kg: number) => String(Math.round(kg * 100) / 100)

// Estimated 1RM, rounded to one decimal.
export const formatEstimate = (kg: number) => kg.toFixed(1)

// "+2.9" or "−1.3" (a real minus sign, U+2212). `rising` is true only above zero after rounding.
export function formatChange(change: number): { text: string; rising: boolean } {
  const rounded = Math.round(change * 10) / 10
  return { text: `${rounded < 0 ? '−' : '+'}${Math.abs(rounded).toFixed(1)}`, rising: rounded > 0 }
}

// Short warnings that say only what's wrong, for the entry page's estimate line.
const WARNINGS: Record<WeightProblem | RepsProblem, string> = {
  'not-a-number': 'Numbers only',
  'too-heavy': 'Max 999.99 kg',
  'too-many-decimals': 'Max 2 decimals',
  'not-positive': 'Weight must be more than 0',
  'not-whole': 'Whole reps only',
  'too-many': 'Max 12 reps',
  'too-few': 'At least 1 rep',
}
export const warningText = (problem: WeightProblem | RepsProblem) => WARNINGS[problem]
