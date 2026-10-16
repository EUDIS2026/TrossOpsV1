"""Build a display-only WGS84 GeoJSON layer from SCB's CC0 county shapefile."""

from __future__ import annotations

import io
import json
from pathlib import Path
from urllib.request import urlopen
import zipfile

from pyproj import Transformer
import shapefile


SOURCE = "https://www.scb.se/contentassets/3443fea3fa6640f7a57ea15d9a372d33/shape_svenska_260225.zip"
OUTPUT = Path(__file__).parents[1] / "frontend" / "public" / "data" / "sweden_counties.geojson"


def transform_coordinates(value, transformer: Transformer):
    if isinstance(value[0], (int, float)):
        lon, lat = transformer.transform(value[0], value[1])
        return [round(lon, 6), round(lat, 6)]
    return [transform_coordinates(part, transformer) for part in value]


def main() -> None:
    with urlopen(SOURCE, timeout=30) as response:
        outer = zipfile.ZipFile(io.BytesIO(response.read()))
    inner = zipfile.ZipFile(io.BytesIO(outer.read("LanSweref99TM.zip")))
    stem = "Lan_Sweref99TM_region"
    reader = shapefile.Reader(
        shp=io.BytesIO(inner.read(f"{stem}.shp")),
        shx=io.BytesIO(inner.read(f"{stem}.shx")),
        dbf=io.BytesIO(inner.read(f"{stem}.dbf")),
        encoding="latin1",
    )
    transformer = Transformer.from_crs("EPSG:3006", "EPSG:4326", always_xy=True)
    features = []
    for item in reader.iterShapeRecords():
        shape = item.shape.__geo_interface__
        features.append({
            "type": "Feature",
            "properties": {"code": item.record[0], "name": f"{item.record[1]} län", "source": "SCB digital borders", "usage": "display only"},
            "geometry": {"type": shape["type"], "coordinates": transform_coordinates(shape["coordinates"], transformer)},
        })
    collection = {"type": "FeatureCollection", "name": "Swedish county boundaries", "source": SOURCE, "license": "CC0", "features": features}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(collection, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(features)} counties to {OUTPUT}")


if __name__ == "__main__":
    main()
