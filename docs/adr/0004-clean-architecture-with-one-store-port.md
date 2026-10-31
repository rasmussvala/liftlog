# Clean Architecture with one store port

The code is split into three layers, and imports only point inward: `domain/` (pure rules) ← `application/` (use cases) ← `adapters/` (Dexie, React, Recharts, browser APIs). Lint rules enforce this, so a wrong import fails CI. Most code is written by agents, so a fixed place for each kind of code, enforced by lint, matters more to us than saving a few files.

The application reaches storage through a single port, `LogbookStore`. Dexie is its only adapter. The port exists to keep `application/` free of Dexie, not to let us swap databases. Tests run the real Dexie adapter on `fake-indexeddb` instead of an in-memory store, so no second copy of the storage rules (one entry per day, replacing everything on import) has to be kept in sync.

Everything else is a plain function call: no ports for the chart, router or clock, because each has only one implementation. Use cases take `today` as a parameter instead of reading the clock.

## Considered Options

- **Full Clean Architecture** (presenters, request/response models, a class per use case, a DI container): too much ceremony for an app this size.
- **An in-memory `LogbookStore` for tests**: a second implementation that could drift from Dexie, when `fake-indexeddb` is just as fast.
- **No layers, screens call Dexie directly**: fastest to start, but the data rules end up spread across screens.

## Consequences

- Screens get live updates with Dexie's `useLiveQuery` wrapped around use-case calls. This works because Dexie tracks the queries made inside it, even through the application layer, so the UI's reactivity quietly depends on the store being Dexie. If the store ever changes, the UI needs another way to be told about changes.
