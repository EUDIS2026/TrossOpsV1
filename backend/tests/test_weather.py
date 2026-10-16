from app.weather import parse_forecast


def test_forecast_keeps_source_time_grid_and_units() -> None:
    result = parse_forecast({
        "createdTime": "2026-10-16T11:30:00Z",
        "referenceTime": "2026-10-16T11:15:00Z",
        "geometry": {"coordinates": [18.077, 59.330]},
        "timeSeries": [{"time": "2026-10-16T12:00:00Z", "data": {"air_temperature": 15.2, "wind_speed": 3.4}}],
    }, "stockholm")
    assert result["kind"] == "forecast"
    assert result["validTime"] == "2026-10-16T12:00:00Z"
    assert result["gridPoint"] == [18.077, 59.330]
    assert result["data"]["wind_speed"] == 3.4
    assert result["units"]["wind_speed"] == "m/s"
