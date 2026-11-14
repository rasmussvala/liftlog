import { useState } from 'react'
import { MAX_REPS, MIN_REPS, validateEntry, WEIGHT_LIMIT_KG, type Day, type Entry } from '../../../domain/entry'
import { estimate1RM } from '../../../domain/progress'
import { formatWeight, warningText } from '../format'

type Field = 'weight' | 'reps'

const WEIGHT_STEP = 2.5

interface Draft {
  day: Day
  // What the user typed. Undefined means untouched: the day's saved value, or empty on a day without one.
  weight?: string
  reps?: string
  // A field's warning shows only once the user has left it, or tapped Save while it's invalid.
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

  // Where the steppers start without a valid typed value: the saved values when editing, else the latest entry.
  // The latest entry shows as grey placeholders (0 and 0 for a first entry), but not while editing.
  const latest = editing ? undefined : entries[0]
  const stepFrom = editing ?? latest
  // Untouched placeholders are valid defaults when there is a previous entry. A cleared or invalid typed
  // field stays invalid instead of silently falling back to the placeholder.
  const weightKg = draft.weight === undefined ? stepFrom?.weightKg : check.weightKg
  const repsValue = draft.reps === undefined ? stepFrom?.reps : check.reps
  const valid = weightKg !== undefined && repsValue !== undefined
  const weightBase = check.weightKg ?? stepFrom?.weightKg ?? 0
  const repsBase = check.reps ?? stepFrom?.reps ?? 0

  const weightWarning = draft.left.weight && check.weightProblem ? warningText(check.weightProblem) : undefined
  const repsWarning = draft.left.reps && check.repsProblem ? warningText(check.repsProblem) : undefined

  const setWeight = (text: string) => setDraft((d) => ({ ...d, weight: text }))
  const setReps = (text: string) => setDraft((d) => ({ ...d, reps: text }))

  return {
    day: draft.day,
    editing,
    weight,
    reps,
    placeholder: placeholderFor(editing, latest),
    // Typed values plus untouched defaults; placeholders stay grey but can be saved.
    values: valid ? { weightKg: weightKg!, reps: repsValue! } : undefined,
    estimated1RM: valid ? estimate1RM(weightKg!, repsValue!) : undefined,
    weightWarning,
    repsWarning,
    setWeight,
    setReps,
    // Weight steps stay over 0 and under the limit. Reps stay within 1–12.
    canLessWeight: weightBase - WEIGHT_STEP > 0,
    canMoreWeight: weightBase + WEIGHT_STEP < WEIGHT_LIMIT_KG,
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

function placeholderFor(editing: Entry | undefined, latest: Entry | undefined) {
  if (editing) return undefined
  return latest
    ? { weight: formatWeight(latest.weightKg), reps: String(latest.reps) }
    : { weight: '0', reps: '0' }
}

export type EntryDraft = ReturnType<typeof useEntryDraft>
