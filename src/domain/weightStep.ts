export const WEIGHT_STEPS_KG = [0.5, 1, 1.25, 2.5, 5] as const
export type WeightStepKg = (typeof WEIGHT_STEPS_KG)[number]
export const DEFAULT_WEIGHT_STEP_KG: WeightStepKg = 2.5

// Adds or subtracts the chosen increment without accumulating floating-point decimal noise.
export function stepWeight(weightKg: number, direction: -1 | 1, stepKg: WeightStepKg): number {
  const weightHundredths = Math.round(weightKg * 100)
  return (weightHundredths + direction * stepKg * 100) / 100
}
