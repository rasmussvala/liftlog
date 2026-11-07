import { describe, expect, it } from 'vitest'
import { currentEstimate, estimate1RM, progress, targets } from './progress'

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

describe('progress', () => {
  const entry = (day: string, weightKg: number, reps: number) => ({ id: 0, exerciseId: 1, day, weightKg, reps })

  it('gives one point per entry, oldest day first, from entries in any order', () => {
    const points = progress([entry('2026-10-10', 60, 10), entry('2026-09-01', 140, 1), entry('2026-10-05', 100, 5)])
    expect(points.map((p) => p.day)).toEqual(['2026-09-01', '2026-10-05', '2026-10-10'])
    expect(points[0].estimated1RM).toBe(140)
    expect(points[1].estimated1RM).toBeCloseTo(116.67, 2)
    expect(points[2].estimated1RM).toBeCloseTo(80, 5)
  })
})

describe('targets', () => {
  const entry = (day: string, weightKg: number, reps: number) => ({ id: 0, exerciseId: 1, day, weightKg, reps })

  it('is undefined with no entries', () => {
    expect(targets([])).toBeUndefined()
  })

  it('gives the lightest 2.5 kg step that beats a 100 kg estimate, for 1 to 12 reps', () => {
    // 75 × 10 is exactly 100, so the latest estimated 1RM is 100 kg.
    const result = targets([entry('2026-10-01', 75, 10)])
    expect(result?.beat).toBe(100)
    expect(result?.targets).toEqual([
      { reps: 1, weightKg: 102.5 },
      { reps: 2, weightKg: 95 },
      { reps: 3, weightKg: 92.5 },
      { reps: 4, weightKg: 90 },
      { reps: 5, weightKg: 87.5 },
      { reps: 6, weightKg: 85 },
      { reps: 7, weightKg: 82.5 },
      { reps: 8, weightKg: 80 },
      { reps: 9, weightKg: 77.5 },
      { reps: 10, weightKg: 77.5 },
      { reps: 11, weightKg: 75 },
      { reps: 12, weightKg: 72.5 },
    ])
  })

  it('moves an exact landing up one step', () => {
    // 75 kg × 10 reps is exactly 100 kg, which only matches beat.
    const ten = targets([entry('2026-10-01', 75, 10)])?.targets.find((t) => t.reps === 10)
    expect(ten?.weightKg).toBe(77.5)
  })

  it('gives the next step above beat for 1 rep, since a single rep is its own 1RM', () => {
    expect(targets([entry('2026-10-01', 101, 1)])?.targets[0]).toEqual({ reps: 1, weightKg: 102.5 })
    expect(targets([entry('2026-10-01', 100, 1)])?.targets[0]).toEqual({ reps: 1, weightKg: 102.5 })
  })

  it('beats the latest entry, not the best one', () => {
    const result = targets([entry('2026-10-01', 140, 1), entry('2026-10-08', 60, 10)])
    expect(result?.beat).toBeCloseTo(80, 5)
  })

  it('gives the same result for entries in any order', () => {
    const a = entry('2026-10-01', 100, 5)
    const b = entry('2026-10-05', 82.5, 8)
    const c = entry('2026-10-03', 90, 3)
    expect(targets([a, b, c])).toEqual(targets([c, b, a]))
    expect(targets([b, a, c])).toEqual(targets([a, c, b]))
  })

  it('runs from 1 to 12 reps, ascending', () => {
    const reps = targets([entry('2026-10-01', 80, 6)])?.targets.map((t) => t.reps)
    expect(reps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('always strictly beats beat, while 2.5 kg less would not', () => {
    const latest: [number, number][] = [
      [101.3, 1], [75, 10], [85, 6], [60, 12], [142.5, 3], [20, 2], [97.25, 7], [50, 9], [123.45, 11],
    ]
    for (const [weightKg, reps] of latest) {
      const result = targets([entry('2026-10-01', weightKg, reps)])!
      for (const t of result.targets) {
        expect(t.weightKg % 2.5).toBe(0)
        expect(estimate1RM(t.weightKg, t.reps)).toBeGreaterThan(result.beat)
        expect(estimate1RM(t.weightKg - 2.5, t.reps)).not.toBeGreaterThan(result.beat)
      }
    }
  })
})
