# Architecture

Three layers. Imports only point inward, and lint fails CI if they don't. Why: [ADR 0004](adr/0004-clean-architecture-with-one-store-port.md). Terms: [GLOSSARY.md](../GLOSSARY.md).

```
src/
  domain/        pure rules. Imports nothing from the app or any framework.
  application/   use cases + the LogbookStore port. Imports only domain/.
  adapters/      Dexie, React screens, router, chart, file download.
  main.tsx       composition root: creates the Dexie store, asks the browser to keep storage, hands the store to the UI.
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
| `exercise.ts` | `Exercise` (with its `position` on Home), `STARTER_EXERCISES`, `validateExerciseName(name, otherNames)`: the trimmed name, or `blank` / `too-long` / `taken` |
| `entry.ts` | `Entry`, `Day` (`"2026-10-31"`, the user's local date), `validateEntry(weightText, repsText)`: the parsed values or a problem code per field |
| `progress.ts` | `estimate1RM(weightKg, reps)`, `currentEstimate(entries) → { latest, estimated1RM, change }`, `progress(entries) → { day, estimated1RM }[]` (oldest first, for the chart), `targets(entries) → { beat, targets: { reps, weightKg }[] }` (one Target per rep count, 1–12; `TARGET_STEP_KG` is the 2.5 kg step) |
| `progressChart.ts` | The progress chart's model. `Range` (`M` / `6M` / `Y` / `All`), `openingRange(entries, today)`, `chartModel(entries, today, range, offset)`: for a period (0 = the current one), the window as day numbers, its entries, Best, the change, the header's dates, the y-axis `scale` and `maxOffset`. Also `chartPoints`, `rangeLength`, `windowAt`, `dayNumber` / `dayFromNumber` |
| `backup.ts` | `BackupData` (the version-1 file, ADR 0002), `buildBackup(logbook, exportedAt)`, `serializeBackup(data)`, `backupFileName(day)`, `parseBackup(json)`: upgrades an older version, checks the whole file against the app's own rules, and gives the Backup with its counts and export date, or one problem code |

### application/

| Module | Exports |
|---|---|
| `logbookStore.ts` | `LogbookStore`: the only port. Exercises: `listExercises` (by position), `getExercise`, `addExercise`, `renameExercise`, `deleteExercise` (with entries, atomically), `reorderExercises`. Entries: `listEntries`, `addEntry`, `updateEntry`, `deleteEntry`. Both: `replaceAll` (a Backup's exercises and entries, in one transaction) |
| `homeOverview.ts` | `homeOverview(store)`: one item per exercise, in the user's order, with its current estimate and `entryCount`, for Home |
| `exercises.ts` | `listExercises`, `addExercise`, `renameExercise`, `deleteExercise` (deletes its entries too), `moveExercise(store, id, toIndex)` |
| `entries.ts` | `exerciseLog(store, id) → { exercise, entries } \| 'not-found'` (entries newest first, each with its estimated 1RM), `saveEntry(store, input, today)` (adds, or updates the day's entry), `deleteEntry(store, id)` |
| `backup.ts` | `exportBackup(store, exportedAt)`: every exercise in the user's order with its entries, as `BackupData`. `importBackup(store, backup)`: replaces everything with a Backup `parseBackup` has checked |

Use cases are plain functions that take the store as their first argument. Anything time-dependent takes `today` as a parameter.

### adapters/

| Module | What it does |
|---|---|
| `dexie/dexieLogbookStore.ts` | The Dexie database and `LogbookStore` implementation. The only module that imports Dexie (its test file does too) |
| `ui/router.ts` | Hash routing: `Route`, `useRoute()`, `href(route)`, `openScreen(route)`, `goHome()` ([ADR 0003](adr/0003-hash-routing.md)) |
| `ui/PushedScreen.tsx` | The layout for a screen opened from Home: slide-in, "‹ Lifts" back button, large title |
| `ui/CoverPage.tsx` | A full-screen page over a screen: slides up, header with its own buttons, no drag to dismiss |
| `ui/FloatingPlus.tsx` | The round + fixed bottom-right: Add exercise on Home, Log entry on the exercise screen |
| `ui/SegmentedControl.tsx` | A pill of equal segments with a sliding selection, accessible as tabs |
| `ui/press.ts` | `press`: the touch-down scale for pressables (the entry page and exercise page use it) |
| `ui/screens/HomeScreen.tsx` | The user's exercises, in their order. + opens New exercise; swipe a row left to edit or delete it; long-press and drag to reorder |
| `ui/SwipeRow.tsx` | A list row that swipes left to show Edit and Delete |
| `ui/useReorder.ts` | Long-press and drag to reorder a list |
| `ui/physics.ts` | Spring, flick projection and rubber-banding for gestures |
| `ui/Kg.tsx` | The grey " kg" unit after a weight |
| `ui/format.ts` | Display formatting: day labels, dates (`dateLabel`), counts (`countLabel`), how long ago (`agoLabel`), weights, 1RM, change, entry warnings; `localToday()` |
| `ui/screens/ExerciseScreen.tsx` | Progress chart, then a History \| Targets segmented control (always opens on History; saving an entry switches back to it). History is newest first, and a row opens its entry to edit or delete. Targets lists one row per rep count, to beat the latest entry. A floating + opens Log entry. No entries: the chart's empty frame, a short message and no tabs |
| `ui/screens/EntryPage.tsx` | Log, edit or delete an entry, on a `CoverPage`. Opened from a history row, the day is locked |
| `ui/screens/ExercisePage.tsx` | New exercise / Edit exercise, on a `CoverPage`: the name, and Delete exercise when editing |
| `ui/screens/useEntryDraft.ts` | The entry page's form state: typed text, placeholders, steppers, warnings |
| `ui/screens/SettingsScreen.tsx` | Grouped lists: a Backup card (Export backup, with how long ago the last one was; Import backup, which checks the picked file, confirms and replaces everything) and About (Version, Build) |
| `ui/ProgressChart.tsx` | The progress chart, after Apple Health's: a Range control, a fixed header, tap or hold-and-slide to read an entry, swipe sideways between periods. Shown for any number of entries |
| `ui/ChartPlot.tsx` | The chart's SVG drawing, with no chart library: gridlines, dated labels, the line and hollow dots |
| `ui/chartAxis.ts` | The chart's geometry and its dated vertical gridlines (weeks, months, quarters or years) |
| `ui/chartMotion.ts` | `useSpring` and the chart's one-finger gesture (tap, hold to scrub, pan, or let the page scroll) |
| `ui/rangePreference.ts` | The last picked Range, remembered per device in browser storage (not in Backups) |
| `ui/backupFile.ts` | `shareOrDownload(text, fileName)`: the share sheet where the browser can share files, else a download |
| `ui/lastBackup.ts` | When the user last exported a Backup, per device in browser storage (not in Backups) |

## Testing

- `domain/`: plain unit tests.
- `application/`: tests against the real Dexie store on `fake-indexeddb`. No mocks of the store. These test files are the one place `application/` may import an adapter, and lint allows it.
- `adapters/dexie/`: tests for schema upgrades, which need a raw old-version database.
- `adapters/ui/`: no tests for now. Screens stay thin, so there's little logic in them to test.
