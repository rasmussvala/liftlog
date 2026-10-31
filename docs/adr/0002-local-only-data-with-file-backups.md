# Local-only data with file backups

All data lives in the browser's IndexedDB on the user's phone. There is no server or account, because this is a single-user app hosted as static files on GitHub Pages. iOS can delete a home-screen web app's data, so the user's only protection is a backup file they export themselves.

A backup has a format version alongside the exercises and entries. Importing a backup checks the whole file first, then replaces all data in one step. It does not merge. The app must keep importing older backup versions, because backups live outside the app and may be restored long after they were made.

## Consequences

- Any change to the stored data needs a matching backup version, and the import code must still read the old ones.
- The app should ask the browser to keep its storage (`navigator.storage.persist()`) and remind the user when their last backup is old.
