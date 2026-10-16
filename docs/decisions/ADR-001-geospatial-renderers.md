# ADR-001: Primary scene rendering

Status: accepted for initial implementation.

Use MapLibre GL JS for projection and camera, with deck.gl's MapboxOverlay in overlaid mode for GPU entity silhouettes and labels. The default online style is OpenFreeMap Dark, with MapLibre attribution visible. A bundled empty style supplies the local-grid fallback without keys or tiles. Both modes were checked in Edge; overlaid mode preserves overlay alignment when switching. Interleaved depth behavior remains untested.

Cesium remains planned as a separately loaded 3D mode after the shared scene contract, altitude semantics, and suitable licensed terrain/assets exist. The current environment has no such assets or keys. This decision follows the geospatial brief's ordering: a working primary map precedes immersive 3D.
