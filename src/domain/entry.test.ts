import { describe, expect, it } from 'vitest'
import { validateEntry } from './entry'

describe('validateEntry', () => {
  it('parses a valid weight and reps', () => {
    expect(validateEntry('117.5', '5')).toEqual({ weightKg: 117.5, reps: 5 })
  })

  it('has neither a value nor a problem for an empty field', () => {
    expect(validateEntry('', '  ')).toEqual({})
    expect(validateEntry('', '5')).toEqual({ reps: 5 })
  })

  it('accepts a comma or a dot as the decimal separator', () => {
    expect(validateEntry('122,5', '5').weightKg).toBe(122.5)
    expect(validateEntry('122.25', '5').weightKg).toBe(122.25)
  })

  it('reads a trailing separator as the whole number', () => {
    expect(validateEntry('100,', '5').weightKg).toBe(100)
    expect(validateEntry(' 100. ', '5').weightKg).toBe(100)
  })

  describe('weight', () => {
    const weight = (text: string) => {
      const { weightKg, weightProblem } = validateEntry(text, '')
      return weightProblem ?? weightKg
    }

    it('must be a number', () => {
      expect(weight('abc')).toBe('not-a-number')
      expect(weight('-5')).toBe('not-a-number')
      expect(weight('1.2.3')).toBe('not-a-number')
      expect(weight('.')).toBe('not-a-number')
      expect(weight('1e3')).toBe('not-a-number')
    })

    it('must be under 1000 kg', () => {
      expect(weight('999.99')).toBe(999.99)
      expect(weight('1000')).toBe('too-heavy')
    })

    it('has at most 2 decimals', () => {
      expect(weight('102.25')).toBe(102.25)
      expect(weight('102.255')).toBe('too-many-decimals')
    })

    it('must be more than 0', () => {
      expect(weight('0.01')).toBe(0.01)
      expect(weight('0')).toBe('not-positive')
      expect(weight('0,00')).toBe('not-positive')
    })

    it('reports the first problem in check order', () => {
      expect(weight('1200.555')).toBe('too-heavy')
      expect(weight('0.001')).toBe('too-many-decimals')
    })
  })

  describe('reps', () => {
    const reps = (text: string) => {
      const { reps, repsProblem } = validateEntry('', text)
      return repsProblem ?? reps
    }

    it('must be whole', () => {
      expect(reps('5.5')).toBe('not-whole')
      expect(reps('5,')).toBe('not-whole')
      expect(reps(',5')).toBe('not-whole')
    })

    it('must be a number', () => {
      expect(reps('five')).toBe('not-a-number')
      expect(reps('-1')).toBe('not-a-number')
    })

    it('are 12 at most', () => {
      expect(reps('12')).toBe(12)
      expect(reps('13')).toBe('too-many')
    })

    it('are 1 at least', () => {
      expect(reps('1')).toBe(1)
      expect(reps('0')).toBe('too-few')
    })

    it('reports the first problem in check order', () => {
      expect(reps('13.5')).toBe('not-whole')
    })
  })
})
