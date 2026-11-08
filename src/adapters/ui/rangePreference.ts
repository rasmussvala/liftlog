// The Range the user last picked on the progress chart, remembered on this device for every Exercise.
// A viewer convenience, not logbook data, so it lives in browser storage and stays out of Backups.
import { RANGES, type Range } from '../../domain/progressChart'

const KEY = `${__DATA_NAMESPACE__}.chartRange`

// Undefined when nothing is remembered or storage is unavailable.
export function rememberedRange(): Range | undefined {
  try {
    const stored = localStorage.getItem(KEY)
    return RANGES.find((range) => range === stored)
  } catch {
    return undefined
  }
}

export function rememberRange(range: Range) {
  try {
    localStorage.setItem(KEY, range)
  } catch {
    // Storage unavailable (private mode, blocked site data): the chart just won't remember.
  }
}
