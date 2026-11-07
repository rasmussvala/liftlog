import { describe, expect, it } from 'vitest'
import type { Entry } from './entry'
import { chartModel, dayNumber, openingRange } from './progressChart'

const TODAY = '2026-11-07'
let nextId = 1
const entry = (day: string, weightKg = 100, reps = 1): Entry => ({ id: nextId++, exerciseId: 1, day, weightKg, reps })

describe('openingRange', () => {
  it('opens on M with no entries', () => {
    expect(openingRange([], TODAY)).toBe('M')
  })

  it('opens on M while every entry fits in a month', () => {
    expect(openingRange([entry('2026-10-15'), entry('2026-11-05')], TODAY)).toBe('M')
  })

  it('opens on 6M for recent entries spanning a year', () => {
    expect(openingRange([entry('2025-11-10'), entry('2026-05-01'), entry('2026-11-01')], TODAY)).toBe('6M')
  })

  it('opens on All when every entry is older than 6 months', () => {
    expect(openingRange([entry('2024-01-01'), entry('2025-12-01')], TODAY)).toBe('All')
  })
})

describe('chartModel window', () => {
  const now = dayNumber(TODAY)
  const history = [entry('2023-01-01'), entry('2026-11-01')]

  it.each([
    ['M', 30],
    ['6M', 182],
    ['Y', 365],
  ] as const)('%s ends a twelfth of its %i days after today', (range, days) => {
    const model = chartModel(history, TODAY, range, 0)
    expect(model.end - now).toBeCloseTo(days / 12)
    expect(model.end - model.start).toBeCloseTo(days)
  })

  it.each(['M', '6M', 'Y'] as const)('%s offset 1 is exactly one window earlier', (range) => {
    const current = chartModel(history, TODAY, range, 0)
    const previous = chartModel(history, TODAY, range, 1)
    expect(previous.end).toBeCloseTo(current.start)
    expect(previous.end - previous.start).toBeCloseTo(current.end - current.start)
  })
})

describe('chartModel entries', () => {
  it('holds only the entries inside the window, oldest first, with their estimated 1RM', () => {
    // M at offset 0 runs from 27.5 days before today to 2.5 days after.
    const model = chartModel([entry('2026-11-05', 100, 5), entry('2026-09-01'), entry('2026-10-20', 140, 1)], TODAY, 'M', 0)
    expect(model.entries.map((p) => p.day)).toEqual(['2026-10-20', '2026-11-05'])
    expect(model.entries[0]).toMatchObject({ weightKg: 140, reps: 1, estimated1RM: 140 })
    expect(model.entries[1].estimated1RM).toBeCloseTo(116.67, 2)
  })

  it.each([
    ['a few days', ['2026-11-03', '2026-11-06']],
    ['several years', ['2019-02-14', '2022-06-01', '2026-11-07']],
  ])('All holds the first and last entry of a history of %s', (_, days) => {
    const model = chartModel(days.map((d) => entry(d)), TODAY, 'All', 0)
    expect(model.entries.map((p) => p.day)).toEqual(days)
  })
})

describe('chartModel best and change', () => {
  it('with one entry: best is its estimate and there is no change', () => {
    const model = chartModel([entry('2026-11-01', 100, 5)], TODAY, 'M', 0)
    expect(model.best).toBeCloseTo(116.67, 2)
    expect(model.change).toBeUndefined()
  })

  it('with several: best is the highest, and the change runs from the first to the last', () => {
    // 140, then 120, then 80: best 140, change −60.
    const model = chartModel([entry('2026-11-06', 60, 10), entry('2026-10-15', 140, 1), entry('2026-10-25', 120, 1)], TODAY, 'M', 0)
    expect(model.best).toBe(140)
    expect(model.change).toBeCloseTo(-60, 5)
  })

  it('in an empty period: no best and no change', () => {
    const model = chartModel([entry('2026-11-06'), entry('2026-08-01')], TODAY, 'M', 1)
    expect(model.entries).toEqual([])
    expect(model.best).toBeUndefined()
    expect(model.change).toBeUndefined()
  })
})

describe('chartModel header dates', () => {
  it('starts on the first entry when that is inside the window, and ends today', () => {
    const model = chartModel([entry('2026-10-28'), entry('2026-11-05')], TODAY, 'M', 0)
    expect(model.headerStart).toBe('2026-10-28')
    expect(model.headerEnd).toBe(TODAY)
  })

  it('starts on the window’s first day when the history is longer', () => {
    // M runs from 27.5 days before today, so its first whole day is 27 days back.
    const model = chartModel([entry('2026-01-01'), entry('2026-11-05')], TODAY, 'M', 0)
    expect(model.headerStart).toBe('2026-10-11')
  })

  it('ends on the window’s last day for an earlier period', () => {
    const model = chartModel([entry('2026-01-01')], TODAY, 'M', 1)
    expect(model.headerStart).toBe('2026-09-11')
    expect(model.headerEnd).toBe('2026-10-10')
  })

  it('is never before the first entry, even on All', () => {
    const model = chartModel([entry('2025-03-14'), entry('2026-11-01')], TODAY, 'All', 0)
    expect(model.headerStart).toBe('2025-03-14')
  })
})

describe('chartModel scale', () => {
  const scaleOf = (...estimates: number[]) =>
    chartModel(estimates.map((kg, i) => entry(`2026-11-0${i + 1}`, kg, 1)), TODAY, 'M', 0).scale

  it('widens a single value to at least 10 kg, on round 5 kg gridlines', () => {
    expect(scaleOf(116.67)).toEqual({ lo: 110, hi: 125, ticks: [110, 115, 120, 125] })
  })

  it('takes in a value just over a round number', () => {
    expect(scaleOf(112, 120.3)).toEqual({ lo: 110, hi: 125, ticks: [110, 115, 120, 125] })
  })

  it('picks a coarser step for a wide spread, at most 4 gaps', () => {
    expect(scaleOf(60, 140)).toEqual({ lo: 60, hi: 140, ticks: [60, 80, 100, 120, 140] })
  })

  it('always covers 10 kg or more, with round steps, at most 4 gaps, and every value inside', () => {
    const cases = [[50], [100, 100.5], [20, 21, 23], [99.9, 100.1], [142.5, 150, 177], [20, 400], [37.5, 80], [200.3, 205.7]]
    for (const values of cases) {
      const scale = scaleOf(...values)!
      const step = scale.ticks[1] - scale.ticks[0]
      expect([1, 2.5, 5, 10, 20, 25, 50, 100]).toContain(step)
      expect(scale.hi - scale.lo).toBeGreaterThanOrEqual(10)
      expect(scale.ticks.length - 1).toBeLessThanOrEqual(4)
      expect(scale.ticks[0]).toBe(scale.lo)
      expect(scale.ticks.at(-1)).toBe(scale.hi)
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(scale.lo)
        expect(v).toBeLessThanOrEqual(scale.hi)
      }
    }
  })

  it('has no scale for an empty period', () => {
    expect(chartModel([entry('2026-01-01')], TODAY, 'M', 0).scale).toBeUndefined()
  })
})

describe('chartModel maxOffset', () => {
  it('is 0 with no entries, or when every entry is in the current period', () => {
    expect(chartModel([], TODAY, 'M', 0).maxOffset).toBe(0)
    expect(chartModel([entry('2026-10-20')], TODAY, 'M', 0).maxOffset).toBe(0)
  })

  it('reaches the period holding the first entry, even one just before the current window', () => {
    // M's current window starts 27.5 days back, so an entry 28 days back is in the period before.
    expect(chartModel([entry('2026-10-10')], TODAY, 'M', 0).maxOffset).toBe(1)
    expect(chartModel([entry('2026-09-28')], TODAY, 'M', 0).maxOffset).toBe(1)
  })

  it('counts whole periods back over a long history', () => {
    const model = chartModel([entry('2023-11-07'), entry('2026-11-01')], TODAY, 'Y', 0)
    expect(model.maxOffset).toBe(3)
    expect(chartModel([entry('2023-11-07')], TODAY, 'Y', 3).entries).toHaveLength(1)
  })

  it('is 0 on All, which has no other periods', () => {
    expect(chartModel([entry('2019-01-01'), entry('2026-11-01')], TODAY, 'All', 0).maxOffset).toBe(0)
  })
})
