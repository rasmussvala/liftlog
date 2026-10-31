# AGENTS.md

## Workflow

- All changes go through a pull request; don't push directly to `main`.
- Before merging, rebase the branch onto the latest `main`, then merge with a merge commit (no squash, no fast-forward). History stays linear, and each PR still shows up as one merge commit.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on `rasmussvala/liftlog`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
