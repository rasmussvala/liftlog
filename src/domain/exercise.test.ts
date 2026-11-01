import { describe, expect, it } from 'vitest'
import { validateExerciseName } from './exercise'

describe('validateExerciseName', () => {
  it('accepts a new name, trimmed, with its capitalisation kept', () => {
    expect(validateExerciseName('  front Squat ', ['Squat'])).toEqual({ name: 'front Squat' })
  })

  it('accepts any name when there are no other exercises', () => {
    expect(validateExerciseName('Squat', [])).toEqual({ name: 'Squat' })
  })

  it('refuses a name that is blank after trimming', () => {
    expect(validateExerciseName('', [])).toEqual({ problem: 'blank' })
    expect(validateExerciseName('   ', [])).toEqual({ problem: 'blank' })
  })

  it('allows 40 characters and refuses 41, after trimming', () => {
    expect(validateExerciseName('a'.repeat(40), [])).toEqual({ name: 'a'.repeat(40) })
    expect(validateExerciseName(` ${'a'.repeat(40)} `, [])).toEqual({ name: 'a'.repeat(40) })
    expect(validateExerciseName('a'.repeat(41), [])).toEqual({ problem: 'too-long' })
  })

  it('refuses a name another exercise has, ignoring case and spaces', () => {
    expect(validateExerciseName('Squat', ['Bench press', 'Squat'])).toEqual({ problem: 'taken' })
    expect(validateExerciseName(' squat ', ['Squat'])).toEqual({ problem: 'taken' })
  })

  it('checks blank, then too long, then taken', () => {
    expect(validateExerciseName(' ', [''])).toEqual({ problem: 'blank' })
    const long = 'a'.repeat(41)
    expect(validateExerciseName(long, [long])).toEqual({ problem: 'too-long' })
  })
})
