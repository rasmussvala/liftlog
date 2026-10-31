// Estimated one-rep max (kg) with the Epley formula: w × (1 + reps / 30).
// A single rep is already a 1RM, so it is returned as is.
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}
