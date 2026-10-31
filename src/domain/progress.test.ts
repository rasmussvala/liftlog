import { describe, expect, it } from 'vitest'
import { estimate1RM } from './progress'

describe('estimate1RM', () => {
  it('applies the Epley formula', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 2)
    expect(estimate1RM(60, 10)).toBeCloseTo(80, 5)
  })

  it('returns the weight itself for a single rep', () => {
    expect(estimate1RM(140, 1)).toBe(140)
  })
})
