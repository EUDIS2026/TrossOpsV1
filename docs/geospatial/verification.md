# Verification log

16 October 2026, local Windows host, Edge headless at 1440 × 900.

## Executed

- `cd backend; python -m pytest -q`: **3 passed**. A synthetic support fault changes revision and both computed services; revision 1 replays its prior state; a file-backed event store survives a new `World` instance; health and scene endpoints respond.
- `cd frontend; npm.cmd run build`: **passed** with MapLibre GL JS 6.14.0. Vite reports a large 2.19 MB main JS chunk; bundle splitting remains open.
- `cd frontend; npm.cmd audit --json`: **0 vulnerabilities** after updating MapLibre from 5.x.
- `cd frontend; node scripts/verify-local.mjs`: **passed** in installed Edge. Page errors: **0**. Verified online basemap rendering, scene load, service selection, dependency control, fault command, service change, revision replay, return to latest, and forced tile-failure fallback.
- Direct HTTP through Vite proxy: revision 1 available → support fault revision 2 unavailable with blocker → repair revision 3 available.
- Actual API process restart after the browser fault: revision 2, unavailable aircraft/service, and one event remained. A repair then created revision 3 and restored the service.

## Artifacts

- [Initial scene](local-browser.png)
- [Fault and dependency view](local-browser-fault.png)
- [Tile-failure local fallback](local-browser-fallback.png)

## Limits

The browser check exercises the synthetic SQLite-backed API and public OpenFreeMap tiles. It does not verify hosted persistence, real telemetry, 3D, multi-user consistency, frame time, or production deployment. No FPS claim is made. The browser script assumes Edge is installed at the standard Windows path.
