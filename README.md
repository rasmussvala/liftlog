# liftlog

A personal one-rep-max tracker. A phone-first PWA you add to your home screen.

- Log sets as weight (kg) × reps
- Estimated 1RM via Epley: `w × (1 + reps / 30)`
- Per-exercise chart and history
- Local-only storage, with JSON export/import for backup

Stack: Vite, React, TypeScript, Tailwind, Dexie, vite-plugin-pwa. Deployed to GitHub Pages.

## PR previews

Add the `preview` label to a pull request to publish it at `https://rasmussvala.github.io/liftlog/pr-preview/pr-<number>/`. A comment on the PR links to it. New pushes update the preview while the label is on, and removing the label or closing the PR deletes it.

A preview keeps its own data (the `liftlog-preview` database), so it never touches the real logbook, and it doesn't install as an offline app. The real site and the previews both live on the `gh-pages` branch, which GitHub Pages serves: `deploy.yml` publishes `main` there, and `preview.yml` handles previews.
