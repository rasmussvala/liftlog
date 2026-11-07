import { describe, expect, it } from 'vitest'
import { backupFileName, serializeBackup } from './backup'

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
