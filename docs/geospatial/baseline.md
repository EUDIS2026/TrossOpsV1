# Geospatial baseline

Status: **partial** (16 October 2026).

The repository began as an empty clone with instructions, a README, and the geospatial brief. There were no application packages, tests, map components, integrations, commits, or known-good browser baseline. The initial implementation adds a synthetic FastAPI scene API and React/Vite MapLibre/deck.gl client. No real organization or military data is present.

## Current integration surfaces

- `GET /api/health`: service and mode metadata.
- `GET /api/scene`: revisioned synthetic scene snapshot, entities, computed service state, and event log.
- `POST /api/events`: revision checked synthetic fault/repair command.
- Frontend scene, fleet selection, inspector, event history, and service consequence.

## Risks and limitations

- State is process memory; restart resets the scenario. Multi-user persistence and replay are planned.
- The map uses an empty local style and synthetic positions. Licensed basemap/terrain and actual vector geography are planned.
- Entity silhouettes are GPU polygons, not geodetically sized models. GLB assets and LOD are planned.
- No telemetry, ERP, SpacetimeDB, NATS, Cesium, external tiles, or live integrations are connected.
- No pre-existing screenshot existed. The new local browser screenshots and executed checks are recorded in [verification](verification.md).

See [renderer decision](../decisions/ADR-001-geospatial-renderers.md).
