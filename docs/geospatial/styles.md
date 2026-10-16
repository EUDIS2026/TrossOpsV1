# Basemap styles and attribution

The online mode uses [OpenFreeMap's dark MapLibre style](https://tiles.openfreemap.org/styles/dark), checked live on 16 October 2026. The provider's [quick start](https://openfreemap.org/quick_start/) lists the dark style and MapLibre setup. [OpenFreeMap](https://openfreemap.org/) permits website and commercial use without a key and requires attribution. MapLibre displays the style's OpenFreeMap, OpenMapTiles, and OpenStreetMap attribution in the map control.

The local-grid mode is a bundled empty MapLibre style plus a UI grid; it works without a tile service and deliberately does not imply real geographic context. If the online style errors, the client switches to this local mode. The user may also switch modes explicitly.

OpenFreeMap's public instance has no SLA. No OpenFreeMap tiles are bundled or redistributed in this repository. Its documented offline download limit is 3,000 tiles or 50 MB per download, with no more than four parallel requests; this project does not perform offline tile downloads.

All service polygons, planned routes, and asset positions are synthetic TrossOps scenario content supplied by the API. They are separate from OpenStreetMap data.
