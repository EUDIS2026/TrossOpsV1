# Verification log

16 October 2026, local Windows host, Edge headless at 1440 × 900.

## Executed

- `cd backend; python -m pytest -q`: **5 passed**. Tests cover revisioned synthetic world behavior and SMHI forecast parsing.
- `cd frontend; npm.cmd run build`: **passed** with MapLibre GL JS 6.14.0 and deck.gl 9.4.0. Vite reports a large main JS chunk; splitting remains open.
- `cd frontend; node scripts/verify-local.mjs`: **passed**, page errors **0**. Exercised search, county toggle, terrain and globe mode switches, weather inspector, fault → service consequence → replay → repair, and forced online tile failure → local grid.
- Live API request for Stockholm returned a connected SMHI forecast with air temperature, wind speed/direction, cloud cover, and forecast timestamps.

## Artifacts

- [2D map](local-browser.png)
- [Terrain perspective](local-browser-terrain.png)
- [Globe and county boundaries](local-browser-globe.png)
- [Weather inspector](local-browser-weather.png)
- [Fault consequence](local-browser-fault.png)
- [Offline basemap fallback](local-browser-fallback.png)

## Limits

The terrain view uses real elevation tiles but synthetic service areas are illustrative extrusions; deck.gl overlays are not draped onto terrain. SCB boundaries are simplified for thematic display. Weather is a forecast, not an observation, and does not drive service status. No FPS, cinematic quality, hosted persistence, live telemetry, LLM, or production deployment claim is made.
