# ADR-001: Scene rendering

Status: accepted for the current workstation slice.

MapLibre GL JS 6 owns the map camera, base style, globe projection, county outlines, Mapterhorn terrain, and OpenStreetMap building extrusions for City 3D. deck.gl 9.4's dedicated `MapLibreOverlay` renders the synthetic scene and forecast points over the map. The older `MapboxOverlay` was replaced after Edge exposed its incompatibility with MapLibre 6 terrain elevation.

This stack supports the verified 2D, terrain, and globe views without a proprietary map key. It does not make deck.gl geometry follow the DEM surface; the service area extrusions are illustrative. A future detailed 3D mode requires defined asset altitude, licensed models, terrain alignment, and a browser performance budget.
