import { describe, expect, it } from 'vitest'
import { backupFileName, parseBackup, serializeBackup } from './backup'

describe('backupFileName', () => {
  it('names the file after the local day it was made', () => {
    expect(backupFileName('2026-11-07')).toBe('liftlog-backup-2026-11-07.json')
  })
})

describe('serializeBackup', () => {
  it('writes readable JSON in the version-1 shape', () => {
    const json = serializeBackup({
      version: 1,
      exportedAt: '2026-11-07T20:15:00.000Z',
      exercises: [{ name: 'Squat', entries: [{ day: '2026-10-31', weightKg: 100, reps: 5 }] }],
    })

    expect(json).toBe(`{
  "version": 1,
  "exportedAt": "2026-11-07T20:15:00.000Z",
  "exercises": [
    {
      "name": "Squat",
      "entries": [
        {
          "day": "2026-10-31",
          "weightKg": 100,
          "reps": 5
        }
      ]
    }
  ]
}
`)
  })
})

// A valid version-1 file, as exported, for each test to break one way.
const validFile = () => ({
  version: 1,
  exportedAt: '2026-11-03T18:30:00.000Z',
  exercises: [
    {
      name: 'Squat',
      entries: [
        { day: '2026-10-31', weightKg: 100, reps: 5 },
        { day: '2026-11-03', weightKg: 102.5, reps: 5 },
      ],
    },
    { name: 'Bench press', entries: [{ day: '2026-11-01', weightKg: 80, reps: 8 }] },
    { name: 'Pull-up', entries: [] },
  ],
})

describe('parseBackup', () => {
  it('reads a valid file with its exercise count, entry count and export date', () => {
    const file = validFile()

    const read = parseBackup(JSON.stringify(file))

    expect(read).toEqual({
      backup: file,
      exerciseCount: 3,
      entryCount: 3,
      exportedAt: new Date('2026-11-03T18:30:00.000Z'),
    })
  })

  it.each([
    ['text that is not JSON', 'squat 100 5'],
    ['JSON that is not an object', '[1, 2, 3]'],
    ['an object with no version', JSON.stringify({ exportedAt: '2026-11-03T18:30:00.000Z', exercises: [] })],
    ['a version that is not a whole number', JSON.stringify({ ...validFile(), version: 1.5 })],
    ['a version below 1', JSON.stringify({ ...validFile(), version: 0 })],
    ['an export date that is not a date', JSON.stringify({ ...validFile(), exportedAt: 'yesterday' })],
    ['exercises that are not a list', JSON.stringify({ ...validFile(), exercises: {} })],
    ['an exercise with no name', JSON.stringify({ ...validFile(), exercises: [{ entries: [] }] })],
    ['an exercise with no entries list', JSON.stringify({ ...validFile(), exercises: [{ name: 'Squat' }] })],
    [
      'a weight that is text',
      JSON.stringify({ ...validFile(), exercises: [{ name: 'Squat', entries: [{ day: '2026-10-31', weightKg: '100', reps: 5 }] }] }),
    ],
    [
      'an entry with no day',
      JSON.stringify({ ...validFile(), exercises: [{ name: 'Squat', entries: [{ weightKg: 100, reps: 5 }] }] }),
    ],
  ])('says %s is not a backup', (_, json) => {
    expect(parseBackup(json)).toEqual({ problem: 'not-a-backup' })
  })

  it('says a file from a newer version is newer, whatever its shape', () => {
    expect(parseBackup(JSON.stringify({ ...validFile(), version: 2 }))).toEqual({ problem: 'newer-version' })
    expect(parseBackup(JSON.stringify({ version: 2, lifts: [] }))).toEqual({ problem: 'newer-version' })
  })

  // The file with these exercises in place of the valid ones.
  const withExercises = (exercises: unknown[]) => JSON.stringify({ ...validFile(), exercises })

  it.each([
    ['blank-name', [{ name: '   ', entries: [] }]],
    ['name-too-long', [{ name: 'x'.repeat(41), entries: [] }]],
    [
      'duplicate-name',
      [
        { name: 'Squat', entries: [] },
        { name: ' squat ', entries: [] },
      ],
    ],
  ])('rejects the whole file with %s', (problem, exercises) => {
    expect(parseBackup(withExercises(exercises))).toEqual({ problem })
  })

  it('trims names, as the app does when the user types one', () => {
    const read = parseBackup(withExercises([{ name: ' Squat ', entries: [] }]))

    expect(read.backup?.exercises).toEqual([{ name: 'Squat', entries: [] }])
  })

  // The file with one exercise holding these entries.
  const withEntries = (...entries: unknown[]) => withExercises([{ name: 'Squat', entries }])
  const entry = (values: object) => ({ day: '2026-10-31', weightKg: 100, reps: 5, ...values })

  it.each([
    ['bad-weight', 'of 0 kg', entry({ weightKg: 0 })],
    ['bad-weight', 'below 0 kg', entry({ weightKg: -20 })],
    ['bad-weight', 'of 1000 kg', entry({ weightKg: 1000 })],
    ['bad-weight', 'with 3 decimals', entry({ weightKg: 100.125 })],
    ['bad-reps', 'of 0 reps', entry({ reps: 0 })],
    ['bad-reps', 'of 13 reps', entry({ reps: 13 })],
    ['bad-reps', 'of half a rep', entry({ reps: 5.5 })],
    ['bad-day', 'on a day that is not a date', entry({ day: 'last Monday' })],
    ['bad-day', 'on a day in another format', entry({ day: '31/10/2026' })],
    ['bad-day', 'on a day that is not in the calendar', entry({ day: '2026-02-30' })],
  ])('rejects the whole file with %s for an entry %s', (problem, _, bad) => {
    expect(parseBackup(withEntries(entry({ day: '2026-10-01' }), bad))).toEqual({ problem })
  })

  it('accepts the limits the app itself accepts', () => {
    const read = parseBackup(withEntries(entry({ weightKg: 0.01, reps: 1 }), entry({ day: '2024-02-29', weightKg: 999.99, reps: 12 })))

    expect(read.problem).toBeUndefined()
  })

  it('rejects the whole file with duplicate-day for two entries for one exercise on one day', () => {
    expect(parseBackup(withEntries(entry({ reps: 5 }), entry({ reps: 3 })))).toEqual({ problem: 'duplicate-day' })
  })

  it('allows different exercises an entry on the same day', () => {
    const read = parseBackup(
      withExercises([
        { name: 'Squat', entries: [entry({})] },
        { name: 'Bench press', entries: [entry({})] },
      ]),
    )

    expect(read.problem).toBeUndefined()
  })

  it('keeps only what an entry records, leaving out anything else in the file', () => {
    const read = parseBackup(withEntries({ ...entry({}), id: 7, estimated1RM: 116.7 }))

    expect(read.backup?.exercises[0].entries).toEqual([{ day: '2026-10-31', weightKg: 100, reps: 5 }])
  })
})
