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
| Anything that imports Dexie, React or a browser API | `adapters/` |

## Modules

### domain/

| Module | Exports |
|---|---|
| `exercise.ts` | `Exercise`, `STARTER_EXERCISES`, `validateExerciseName(name, otherNames)`: the trimmed name, or `blank` / `too-long` / `taken` |
| `entry.ts` | `Entry`, `Day` (`"2026-10-31"`, the user's local date), `validateEntry(weightText, repsText)`: the parsed values or a problem code per field |
| `progress.ts` | `estimate1RM(weightKg, reps)`, `currentEstimate(entries) → { latest, estimated1RM, change }`, `progress(entries) → { day, estimated1RM }[]` (oldest first, for the chart) |
| `backup.ts` | `BackupData`, `serializeBackup(data)`, `parseBackup(json)`: checks the file and upgrades old versions |

### application/

| Module | Exports |
|---|---|
| `logbookStore.ts` | `LogbookStore`: the only port. Exercises: `listExercises` (by position), `getExercise`, `addExercise`. Entries: `listEntries`, `addEntry`, `updateEntry`, `deleteEntry` |
| `homeOverview.ts` | `homeOverview(store)`: one item per exercise, in the user's order, with its current estimate and `entryCount`, for Home |
| `exercises.ts` | `listExercises`, `addExercise`, `renameExercise`, `deleteExercise` (refused if it has entries) |
| `entries.ts` | `exerciseLog(store, id) → { exercise, entries } \| 'not-found'` (entries newest first, each with its estimated 1RM), `saveEntry(store, input, today)` (adds, or updates the day's entry), `deleteEntry(store, id)` |
| `backup.ts` | `exportBackup(store)`, `importBackup(store, json)` |

Use cases are plain functions that take the store as their first argument. Anything time-dependent takes `today` as a parameter.

### adapters/

| Module | What it does |
|---|---|
| `dexie/dexieLogbookStore.ts` | The Dexie database and `LogbookStore` implementation. The only module that imports Dexie (its test file does too) |
| `ui/router.ts` | Hash routing: `Route`, `useRoute()`, `href(route)`, `openScreen(route)`, `goHome()` ([ADR 0003](adr/0003-hash-routing.md)) |
| `ui/PushedScreen.tsx` | The layout for a screen opened from Home: slide-in, "‹ Lifts" back button, large title |
| `ui/CoverPage.tsx` | A full-screen page over a screen: slides up, header with its own buttons, no drag to dismiss |
| `ui/press.ts` | `press`: the touch-down scale for pressables (the entry page and Log entry use it) |
| `ui/screens/HomeScreen.tsx` | The user's exercises, in their order. + opens New exercise |
| `ui/Kg.tsx` | The grey " kg" unit after a weight |
| `ui/format.ts` | Display formatting: day labels, weights, 1RM, change, entry warnings; `localToday()` |
| `ui/screens/ExerciseScreen.tsx` | Progress chart, then the Log entry button, then history, newest first. A history row opens its entry to edit or delete |
| `ui/screens/EntryPage.tsx` | Log, edit or delete an entry, on a `CoverPage`. Opened from a history row, the day is locked |
| `ui/screens/ExercisePage.tsx` | New exercise: one name field on a `CoverPage`, with the keyboard up as it opens |
| `ui/screens/useEntryDraft.ts` | The entry page's form state: typed text, placeholders, steppers, warnings |
| `ui/screens/SettingsScreen.tsx` | WIP. Later: export/import |
| `ui/ProgressChart.tsx` | The progress chart, hand-drawn SVG with no chart library: tap or slide to read an entry |
| `ui/backupFile.ts` | Download a backup, read a picked file |

## Testing

- `domain/`: plain unit tests.
- `application/`: tests against the real Dexie store on `fake-indexeddb`. No mocks of the store. These test files are the one place `application/` may import an adapter, and lint allows it.
- `adapters/dexie/`: tests for schema upgrades, which need a raw old-version database.
- `adapters/ui/`: no tests for now. Screens stay thin, so there's little logic in them to test.
