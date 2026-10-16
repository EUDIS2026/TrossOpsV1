# Verification log

16 October 2026, local Windows host, Edge headless at 1440 × 900.

## Executed

- `cd backend; python -m pytest -q`: **2 passed**. A synthetic support fault changes revision and both computed services; revision 1 replays its prior state; health and scene endpoints respond.
- `cd frontend; npm.cmd run build`: **passed** with MapLibre GL JS 6.14.0. Vite reports a large 2.19 MB main JS chunk; bundle splitting remains open.
- `cd frontend; npm.cmd audit --json`: **0 vulnerabilities** after updating MapLibre from 5.x.
- `cd frontend; node scripts/verify-local.mjs`: **passed** in installed Edge. Page errors: **0**. Verified scene load, service selection, dependency control, fault command, service change, revision replay, return to latest, and screenshots.
- Direct HTTP through Vite proxy: revision 1 available → support fault revision 2 unavailable with blocker → repair revision 3 available.

## Artifacts

- [Initial scene](local-browser.png)
- [Fault and dependency view](local-browser-fault.png)

## Limits

The browser check exercises the synthetic in-memory API. It does not verify persistence, real telemetry, external tiles, 3D, multi-user consistency, frame time, or production deployment. No FPS claim is made. The browser script assumes Edge is installed at the standard Windows path.
