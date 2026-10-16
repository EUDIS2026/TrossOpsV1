# Geographic sources and attribution

The dark basemap is [OpenFreeMap Dark](https://tiles.openfreemap.org/styles/dark), using its MapLibre style and visible attribution to OpenFreeMap, OpenMapTiles, and OpenStreetMap. The public instance has no service-level agreement. No basemap tiles are bundled.

Terrain mode uses [Mapterhorn elevation tiles](https://mapterhorn.com/data-access/) through its public TileJSON endpoint. MapLibre adds the elevation source and displays its attribution. Service polygons extrude by an illustrative 500 m; that height is not a measured range or asset altitude.

City 3D mode uses the [OpenFreeMap vector tile source](https://tiles.openfreemap.org/planet) and MapLibre fill extrusions for OpenStreetMap buildings in central Stockholm. Heights come from OpenMapTiles `render_height` / `render_min_height` attributes. [OpenMapTiles describes `render_height`](https://openmaptiles.org/schema/) as an approximate height inferred from mapped height or building levels. Missing height values are rendered flat rather than given an invented height.

County outlines come from [Statistics Sweden's digital boundaries](https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/digitala-granser/) under CC0. `scripts/convert_scb_counties.py` converts the 21 county shapes from SWEREF99 TM to a bundled WGS84 GeoJSON file. SCB states that these boundaries are simplified for thematic display and are unsuitable for precise boundary analysis.

Weather uses the [SMHI SNOW1G point forecast](https://opendata.smhi.se/metfcst/snow1gv1/examples). Values, issue time, valid time, and returned grid point come from the live SMHI response. Four requested city coordinates are public reference points. A missing source returns `unavailable` and no guessed value.

The local-grid mode is an empty bundled MapLibre style. It works without map tiles but gives no real geographic context. All operational assets, service areas, routes, and event revisions are synthetic TrossOps scenario content.
