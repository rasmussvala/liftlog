import {
  DEFAULT_WEIGHT_STEP_KG,
  WEIGHT_STEPS_KG,
  type WeightStepKg,
} from '../../domain/weightStep'

// A device preference, like the chart range, so it stays out of Backups.
const KEY = `${__DATA_NAMESPACE__}.weightStepKg`

export function rememberedWeightStep(): WeightStepKg {
  try {
    const stored = localStorage.getItem(KEY)
    const step = WEIGHT_STEPS_KG.find((option) => String(option) === stored)
    return step ?? DEFAULT_WEIGHT_STEP_KG
  } catch {
    return DEFAULT_WEIGHT_STEP_KG
  }
}

export function rememberWeightStep(step: WeightStepKg) {
  try {
    localStorage.setItem(KEY, String(step))
  } catch {
    // The app keeps the choice in memory for this session when storage is unavailable.
  }
}
