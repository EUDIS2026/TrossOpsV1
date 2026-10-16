# TrossOps — agent working agreement

This is an empty GitHub clone of `https://github.com/EUDIS2026/TrossOps.git`. Implementation briefs live in `docs/briefs/`. Follow them; do not invent live Saab/military data or claim untested integrations.

## Stack (preferred)

- Backend: Python 3.12 + FastAPI
- Frontend: React + TypeScript + Vite
- Git: many small conventional commits (`feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `perf`, `build`)
- Never force-push or rewrite shared history

## Checkpoints

Keep a running, testable app. One vertical slice first, then expand. Record status as `working`, `partial`, `adapter-only`, `planned`, or `blocked`.

## Credit-aware model use

Prefer Cursor models (Composer 2.5, then Grok) for implementation. Reserve prepaid credit and third-party models for hard design/debug. Do not paste the full briefs every turn — they are already in the repo.
