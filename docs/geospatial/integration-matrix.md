# Integration matrix

| Capability | Status | Evidence / next step |
|---|---|---|
| Synthetic scene API | partial | Revision checked commands, deterministic replay, and local SQLite persistence. Hosted persistence and multi-user concurrency remain. |
| Service consequence | partial | Backend computes two services from required asset conditions. Capacity and time reasoning remain. |
| Map workstation | partial | MapLibre 6 with deck.gl's dedicated MapLibre adapter; layer toggles, selectable synthetic geometry, search, replay, and Edge browser flow. |
| Terrain and globe | partial | Mapterhorn DEM terrain and MapLibre globe rendered in Edge. Terrain overlays are illustrative and are not draped on the DEM. Detailed 3D assets and altitude semantics remain. |
| Swedish county boundaries | working | 21 SCB CC0 county shapes converted to WGS84 and displayed. SCB simplifies these boundaries for thematic display; no precise boundary analysis. |
| Swedish weather | working | Live SMHI SNOW1G point forecasts at four public city coordinates, with forecast and valid times. Weather does not feed service feasibility. |
| OpenFreeMap / local grid | working | Online style loaded and forced failure fell back to the local scene in Edge. Public map provider has no SLA. |
| Hosted database | planned | Local SQLite file is unsuitable for Vercel serverless persistence; provision a transactional Postgres service before deployment. |
| LLM scene analysis | planned | Add a credential-gated adapter and explicit provenance before claims of live AI analysis. |
| Asset/ERP records, telemetry | planned | Define authorized source, freshness and identity contracts. Current assets remain synthetic. |
| NATS / SpacetimeDB | planned | Connect after the source and projection contracts exist. |
