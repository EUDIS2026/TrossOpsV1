# Integration matrix

| Capability | Status | Evidence / next step |
|---|---|---|
| Synthetic scene API | partial | Snapshot, revision checked commands, deterministic replay, and local SQLite persistence verified across an API restart; add hosted persistence, multi-user concurrency, and bitemporal semantics. |
| Hosted database | planned | Connect a transactional Postgres service during deployment; current SQLite file is not suitable for serverless persistence. |
| Service consequence | partial | Backend computes two services with a shared support dependency; extend to capacity/temporal reasoning and tests. |
| MapLibre/deck scene | partial | GPU silhouettes, planned paths, selectable service areas, dependency toggle, revision replay, and selection verified in Edge; add LOD and performance measurements. |
| OpenFreeMap basemap | working | Dark style loaded in Edge with attribution; public provider has no SLA. |
| Local grid fallback | working | Forced tile request failure switched to local scene in Edge. |
| Asset/ERP records | planned | Define authorized resource API; current `resourceId` is synthetic only. |
| NATS / SpacetimeDB | planned | Connect only after source and projection contracts exist. |
| Telemetry | planned | Add authorized adapter, timestamp/freshness contract, and end-to-end test. |
| Cesium / terrain / 3D tiles | planned | Require licensed assets and browser verification. |
