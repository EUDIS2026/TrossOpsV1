from __future__ import annotations

from datetime import datetime, timedelta, timezone
from threading import Lock

import httpx


PUBLIC_POINTS = {
    "stockholm": {"label": "Stockholm", "longitude": 18.06, "latitude": 59.33},
    "goteborg": {"label": "Göteborg", "longitude": 11.97, "latitude": 57.71},
    "malmo": {"label": "Malmö", "longitude": 13.00, "latitude": 55.61},
    "kiruna": {"label": "Kiruna", "longitude": 20.22, "latitude": 67.86},
}

UNITS = {
    "air_temperature": "°C",
    "wind_from_direction": "degrees",
    "wind_speed": "m/s",
    "wind_speed_of_gust": "m/s",
    "relative_humidity": "%",
    "cloud_area_fraction": "octas",
    "probability_of_precipitation": "%",
    "visibility_in_air": "km",
}


def parse_forecast(payload: dict, key: str) -> dict:
    point = PUBLIC_POINTS[key]
    series = payload.get("timeSeries") or []
    if not series:
        raise ValueError("SMHI returned no forecast time steps")
    first = series[0]
    data = first.get("data") or {}
    if not data:
        raise ValueError("SMHI returned no forecast parameters")
    return {
        "status": "connected",
        "source": "SMHI SNOW1G point forecast",
        "sourceUrl": "https://opendata.smhi.se/metfcst/snow1gv1",
        "kind": "forecast",
        "location": key,
        "label": point["label"],
        "requestedPoint": [point["longitude"], point["latitude"]],
        "gridPoint": payload.get("geometry", {}).get("coordinates"),
        "createdTime": payload.get("createdTime"),
        "referenceTime": payload.get("referenceTime"),
        "validTime": first.get("time"),
        "data": {name: data.get(name) for name in UNITS},
        "units": UNITS,
    }


class WeatherService:
    def __init__(self) -> None:
        self.lock = Lock()
        self.cache: dict[str, tuple[datetime, dict]] = {}

    def get(self, key: str) -> dict:
        if key not in PUBLIC_POINTS:
            raise KeyError(key)
        now = datetime.now(timezone.utc)
        with self.lock:
            cached = self.cache.get(key)
            if cached and cached[0] > now:
                return cached[1]
        point = PUBLIC_POINTS[key]
        url = f"https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/{point['longitude']}/lat/{point['latitude']}/data.json"
        try:
            with httpx.Client(timeout=8.0) as client:
                response = client.get(url, params={"timeseries": "3"})
                response.raise_for_status()
                result = parse_forecast(response.json(), key)
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            return {"status": "unavailable", "source": "SMHI SNOW1G point forecast", "kind": "forecast", "location": key, "label": point["label"], "reason": "Forecast source unavailable; no value is being estimated."}
        with self.lock:
            self.cache[key] = (now + timedelta(minutes=10), result)
        return result
