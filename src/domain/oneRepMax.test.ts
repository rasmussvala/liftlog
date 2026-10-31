import { describe, expect, it } from 'vitest'
import { estimateOneRepMax } from './oneRepMax'

describe('estimateOneRepMax', () => {
  it('applies the Epley formula', () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 2)
    expect(estimateOneRepMax(60, 10)).toBeCloseTo(80, 5)
  })

  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(140, 1)).toBe(140)
  })
})
