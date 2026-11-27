import { MAX_REPS, MIN_REPS, type Day, type Entry } from './entry'
import { DEFAULT_WEIGHT_STEP_KG, type WeightStepKg } from './weightStep'

// Estimated one-rep max (kg) with the Epley formula: w × (1 + reps / 30).
// A single rep is already a 1RM, so it is returned as is.
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg
  return weightKg * (1 + reps / 30)
}

export interface CurrentEstimate {
  latest: Entry
  estimated1RM: number
  // Latest estimated 1RM minus the previous entry's. Undefined with only one entry.
  change: number | undefined
}

// Where an exercise stands now: its latest entry's estimated 1RM, and the change since the entry before.
// Undefined when there are no entries. Entries may come in any order.
export function currentEstimate(entries: readonly Entry[]): CurrentEstimate | undefined {
  const [latest, previous] = [...entries].sort((a, b) => b.day.localeCompare(a.day))
  if (!latest) return undefined
  const estimated1RM = estimate1RM(latest.weightKg, latest.reps)
  const change = previous ? estimated1RM - estimate1RM(previous.weightKg, previous.reps) : undefined
  return { latest, estimated1RM, change }
}

// One point on the progress chart.
export interface ProgressPoint {
  day: Day
  estimated1RM: number
}

// The chart's points: one per entry, oldest day first. Entries may come in any order.
export function progress(entries: readonly Entry[]): ProgressPoint[] {
  return entries
    .toSorted((a, b) => a.day.localeCompare(b.day))
    .map((entry) => ({ day: entry.day, estimated1RM: estimate1RM(entry.weightKg, entry.reps) }))
}

// The lightest weight, in the selected Weight step, that at these reps gives an estimated 1RM above the current one.
export interface Target {
  reps: number
  weightKg: number
}

export interface Targets {
  // The current estimated 1RM, from the latest entry: every Target strictly beats it.
  beat: number
  // One per rep count from MIN_REPS to MAX_REPS, ascending.
  targets: Target[]
}

// What to lift next, from the latest entry. Undefined with no entries. Entries may come in any order.
export function targets(entries: readonly Entry[], weightStepKg: WeightStepKg = DEFAULT_WEIGHT_STEP_KG): Targets | undefined {
  const current = currentEstimate(entries)
  if (!current) return undefined
  const beat = current.estimated1RM
  // Valid entries have at most two decimal places. Compare Epley numerators in integer
  // hundredths so equal estimates cannot drift apart through floating-point rounding.
  const latestWeightHundredths = Math.round(current.latest.weightKg * 100)
  const latestMultiplier = current.latest.reps === 1 ? 30 : 30 + current.latest.reps
  const beatNumerator = latestWeightHundredths * latestMultiplier
  const targetStepHundredths = weightStepKg * 100
  const rows: Target[] = []
  for (let reps = MIN_REPS; reps <= MAX_REPS; reps++) {
    const multiplier = reps === 1 ? 30 : 30 + reps
    const stepNumerator = targetStepHundredths * multiplier
    const steps = Math.floor(beatNumerator / stepNumerator) + 1
    const weightKg = (steps * targetStepHundredths) / 100
    rows.push({ reps, weightKg })
  }
  return { beat, targets: rows }
}
