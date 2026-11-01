# AGENTS.md

## Workflow

- All changes go through a pull request; don't push directly to `main`.
- Use `dev` for integration: feature PRs target `dev`, and release PRs target `main`.
- Before merging, rebase the branch onto the latest `main`, then merge with a merge commit (no squash, no fast-forward). History stays linear, and each PR still shows up as one merge commit.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on `rasmussvala/liftlog`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Architecture

Code is split into `domain/`, `application/` and `adapters/`, and lint enforces which may import which. See `docs/architecture.md` before adding code.

## Design

Before any UI work, read `docs/design.md`. Use only its colour, text and radius tokens: Tailwind's defaults are switched off.
