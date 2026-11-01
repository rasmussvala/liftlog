// The user's local calendar date, as "YYYY-MM-DD" (e.g. "2026-10-31").
export type Day = string

// The best set the user did for one exercise on one day. At most one per exercise per day (ADR 0001).
// Stores what was lifted, never the estimated 1RM.
export interface Entry {
  id: number
  exerciseId: number
  day: Day
  weightKg: number
  reps: number
}

export type WeightProblem = 'not-a-number' | 'too-heavy' | 'too-many-decimals' | 'not-positive'
export type RepsProblem = 'not-whole' | 'not-a-number' | 'too-many' | 'too-few'

// The two fields as checked by validateEntry: a parsed value, or a problem, per field.
// A field that is empty has neither. Problems are codes: the wording belongs to the UI.
export interface EntryCheck {
  weightKg?: number
  reps?: number
  weightProblem?: WeightProblem
  repsProblem?: RepsProblem
}

// Checks weight and reps as typed. Surrounding spaces are ignored.
export function validateEntry(weightText: string, repsText: string): EntryCheck {
  const check: EntryCheck = {}
  const weight = weightText.trim()
  const reps = repsText.trim()
  if (weight !== '') {
    const problem = weightProblem(weight)
    if (problem) check.weightProblem = problem
    else check.weightKg = Number(weight.replace(',', '.'))
  }
  if (reps !== '') {
    const problem = repsProblem(reps)
    if (problem) check.repsProblem = problem
    else check.reps = Number(reps)
  }
  return check
}

// Over 0 and under 1000 kg, up to 2 decimals. Comma or dot; a trailing one ("100,") means the whole number.
// Checked in this order, so "1200.555" is too heavy.
function weightProblem(text: string): WeightProblem | undefined {
  const match = /^(\d*)[.,]?(\d*)$/.exec(text)
  if (!match || !/\d/.test(text)) return 'not-a-number'
  const kg = Number(text.replace(',', '.'))
  if (kg >= 1000) return 'too-heavy'
  if (match[2].length > 2) return 'too-many-decimals'
  if (kg <= 0) return 'not-positive'
}

// A whole number from 1 to 12, so the estimate stays meaningful. Checked in this order.
function repsProblem(text: string): RepsProblem | undefined {
  if (/^\d*[.,]\d*$/.test(text) && /\d/.test(text)) return 'not-whole'
  if (!/^\d+$/.test(text)) return 'not-a-number'
  const reps = Number(text)
  if (reps > 12) return 'too-many'
  if (reps < 1) return 'too-few'
}
