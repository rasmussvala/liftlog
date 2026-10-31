# Architecture

Three layers. Imports only point inward, and lint fails CI if they don't. Why: [ADR 0004](adr/0004-clean-architecture-with-one-store-port.md). Terms: [GLOSSARY.md](../GLOSSARY.md).

```
src/
  domain/        pure rules. Imports nothing from the app or any framework.
  application/   use cases + the LogbookStore port. Imports only domain/.
  adapters/      Dexie, React screens, router, chart, file download.
  main.tsx       composition root: creates the Dexie store and hands it to the UI.
```

## Where code goes

| You're writing… | It goes in |
|---|---|
| A rule about exercises or entries, a calculation, the backup file format | `domain/` |
| Something the user can do (log an entry, import a backup) | `application/` |
| Anything that imports Dexie, React, Recharts or a browser API | `adapters/` |

## Modules

### domain/

| Module | Exports |
|---|---|
| `exercise.ts` | `Exercise`, `validateExerciseName(name)` |
| `entry.ts` | `Entry`, `Day` (`"2026-10-31"`, the user's local date), `validateEntry({ weightKg, reps })` |
| `progress.ts` | `estimate1RM(weightKg, reps)`, `progress(entries) → { points, best }` |
| `backup.ts` | `BackupData`, `serializeBackup(data)`, `parseBackup(json)`: checks the file and upgrades old versions |

### application/

| Module | Exports |
|---|---|
| `logbookStore.ts` | `LogbookStore`: the only port |
| `exercises.ts` | `listExercises`, `addExercise`, `renameExercise`, `deleteExercise` (refused if it has entries) |
| `entries.ts` | `exerciseLog(store, id) → { entries, progress }`, `saveEntry(store, input, today)`, `deleteEntry` |
| `backup.ts` | `exportBackup(store)`, `importBackup(store, json)` |

Use cases are plain functions that take the store as their first argument. Anything time-dependent takes `today` as a parameter.

### adapters/

| Module | What it does |
|---|---|
| `dexie/dexieLogbookStore.ts` | The Dexie database and `LogbookStore` implementation. The only file that imports Dexie |
| `ui/router.ts` | Hash routing: `Route`, `useRoute()`, `href(route)` ([ADR 0003](adr/0003-hash-routing.md)) |
| `ui/screens/HomeScreen.tsx` | The user's exercises |
| `ui/screens/ExerciseScreen.tsx` | Chart, today's entry form, recent entries |
| `ui/screens/SettingsScreen.tsx` | Manage exercises, export/import |
| `ui/ProgressChart.tsx` | The only file that imports Recharts |
| `ui/backupFile.ts` | Download a backup, read a picked file |

## Testing

- `domain/`: plain unit tests.
- `application/`: tests against the real Dexie store on `fake-indexeddb`. No mocks of the store.
- `adapters/ui/`: no tests for now. Screens stay thin, so there's little logic in them to test.
