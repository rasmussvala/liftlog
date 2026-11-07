# Local-only data with file backups

All data lives in the browser's IndexedDB on the user's phone. There is no server or account, because this is a single-user app hosted as static files on GitHub Pages. iOS can delete a home-screen web app's data, so the user's only protection is a backup file they export themselves.

A backup has a format version alongside the exercises and entries. Importing a backup checks the whole file first, then replaces all data in one step. It does not merge. The app must keep importing older backup versions, because backups live outside the app and may be restored long after they were made.

The file is JSON with entries nested under their exercise: `{ version, exportedAt, exercises: [{ name, entries: [{ day, weightKg, reps }] }] }`. Exercises are listed in the user's order, which gives their position. Database ids are left out, because they only mean something on one phone, and new ones are assigned on import. Nesting means an entry can't point at an exercise that isn't there, so the import has less to check than with separate lists linked by id or name. Estimated 1RMs aren't stored, because they're always worked out from entries.

## Consequences

- Any change to the stored data needs a matching backup version, and the import code must still read the old ones.
- The app should ask the browser to keep its storage (`navigator.storage.persist()`) and remind the user when their last backup is old.
