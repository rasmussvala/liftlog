import { useState } from 'react'
import { validateEntry, type Day, type Entry } from '../../../domain/entry'
import { estimate1RM } from '../../../domain/progress'
import { formatWeight, warningText } from '../format'

type Field = 'weight' | 'reps'

const WEIGHT_STEP = 2.5
const MIN_REPS = 1
const MAX_REPS = 12

interface Draft {
  day: Day
  // What the lifter typed. Undefined means untouched: the day's saved value, or empty on a day without one.
  weight?: string
  reps?: string
  // A field's warning shows only once the lifter has left it, or tapped Save while it's invalid.
  left: Record<Field, boolean>
}

// The entry page's form: one draft for any day. A day that has an entry means editing that entry.
// `entries` is the exercise's entries, newest first, read live.
export function useEntryDraft(entries: readonly Entry[], startDay: Day) {
  const [draft, setDraft] = useState<Draft>({ day: startDay, left: { weight: false, reps: false } })
  const editing = entries.find((entry) => entry.day === draft.day)
  const weight = draft.weight ?? (editing ? formatWeight(editing.weightKg) : '')
  const reps = draft.reps ?? (editing ? String(editing.reps) : '')
  const check = validateEntry(weight, reps)
  const valid = check.weightKg !== undefined && check.reps !== undefined

  // Shown in grey in an empty field, and where the steppers start without a valid typed value:
  // the saved values when editing, else the latest entry.
  const reference = editing ?? entries[0]
  const weightBase = check.weightKg ?? reference?.weightKg ?? 0
  const repsBase = check.reps ?? reference?.reps ?? 0

  const weightWarning = draft.left.weight && check.weightProblem ? warningText(check.weightProblem) : undefined
  const repsWarning = draft.left.reps && check.repsProblem ? warningText(check.repsProblem) : undefined

  const setWeight = (text: string) => setDraft((d) => ({ ...d, weight: text }))
  const setReps = (text: string) => setDraft((d) => ({ ...d, reps: text }))

  return {
    day: draft.day,
    editing,
    weight,
    reps,
    placeholder: reference && { weight: formatWeight(reference.weightKg), reps: String(reference.reps) },
    // Both values, once both are valid.
    values: valid ? { weightKg: check.weightKg!, reps: check.reps! } : undefined,
    estimated1RM: valid ? estimate1RM(check.weightKg!, check.reps!) : undefined,
    weightWarning,
    repsWarning,
    setWeight,
    setReps,
    // Weight − stops before 0. Reps stay within 1–12.
    canLessWeight: weightBase - WEIGHT_STEP > 0,
    canLessReps: repsBase > MIN_REPS,
    canMoreReps: repsBase < MAX_REPS,
    stepWeight: (sign: 1 | -1) => setWeight(formatWeight(weightBase + sign * WEIGHT_STEP)),
    stepReps: (sign: 1 | -1) => setReps(String(Math.min(MAX_REPS, Math.max(MIN_REPS, repsBase + sign)))),
    leave: (field: Field) => setDraft((d) => ({ ...d, left: { ...d.left, [field]: true } })),
    // Tapping a dimmed Save shows what's wrong with both fields.
    leaveBoth: () => setDraft((d) => ({ ...d, left: { weight: true, reps: true } })),
    // A day with an entry switches to editing it. An empty day keeps only what was typed.
    pickDay: (day: Day) =>
      setDraft((d) => (entries.some((entry) => entry.day === day) ? { day, left: d.left } : { ...d, day })),
  }
}

export type EntryDraft = ReturnType<typeof useEntryDraft>
