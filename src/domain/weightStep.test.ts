import { describe, expect, it } from 'vitest'
import { stepWeight } from './weightStep'

describe('stepWeight', () => {
  it('adds and subtracts the selected step from the current entry weight', () => {
    expect(stepWeight(82.25, 1, 0.5)).toBe(82.75)
    expect(stepWeight(82.25, -1, 0.5)).toBe(81.75)
  })
})
