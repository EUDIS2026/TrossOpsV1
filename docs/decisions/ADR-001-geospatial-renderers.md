# ADR-001: Primary scene rendering

Status: accepted for initial implementation.

Use MapLibre GL JS for projection and camera, with deck.gl's MapboxOverlay in overlaid mode for GPU entity silhouettes and labels. The initial style contains no external tile source, keeping the synthetic scene reproducible without keys or unverified map licenses. Overlaid mode avoids untested interleaved depth behavior. Verify visual alignment in a browser before switching to interleaved mode.

Cesium remains planned as a separately loaded 3D mode after the shared scene contract, altitude semantics, and suitable licensed terrain/assets exist. The current environment has no such assets or keys. This decision follows the geospatial brief's ordering: a working primary map precedes immersive 3D.
