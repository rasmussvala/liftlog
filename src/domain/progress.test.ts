import { describe, expect, it } from 'vitest'
import { currentEstimate, estimate1RM } from './progress'

describe('estimate1RM', () => {
  it('applies the Epley formula', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 2)
    expect(estimate1RM(60, 10)).toBeCloseTo(80, 5)
  })

  it('returns the weight itself for a single rep', () => {
    expect(estimate1RM(140, 1)).toBe(140)
  })
})

describe('currentEstimate', () => {
  const entry = (day: string, weightKg: number, reps: number) => ({ id: 0, exerciseId: 1, day, weightKg, reps })

  it('is undefined with no entries', () => {
    expect(currentEstimate([])).toBeUndefined()
  })

  it('takes the estimated 1RM from a single entry, with no change', () => {
    const only = entry('2026-10-01', 100, 5)
    const result = currentEstimate([only])
    expect(result?.latest).toEqual(only)
    expect(result?.estimated1RM).toBeCloseTo(116.67, 2)
    expect(result?.change).toBeUndefined()
  })

  it('uses the latest day, and the change since the previous entry', () => {
    const result = currentEstimate([entry('2026-10-10', 60, 10), entry('2026-10-01', 100, 5), entry('2026-10-05', 140, 1)])
    expect(result?.latest.day).toBe('2026-10-10')
    expect(result?.estimated1RM).toBeCloseTo(80, 5)
    expect(result?.change).toBeCloseTo(-60, 5)
  })

  it('reports a rise as a positive change', () => {
    const result = currentEstimate([entry('2026-10-01', 60, 10), entry('2026-10-08', 100, 5)])
    expect(result?.change).toBeCloseTo(36.67, 2)
  })
})
