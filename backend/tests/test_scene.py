from fastapi.testclient import TestClient

from app.main import World, app


def test_fault_changes_revision_and_computed_service() -> None:
    world = World()
    assert world.snapshot()["services"][0]["status"] == "available"
    from app.main import EventIn
    result = world.apply(EventIn(assetId="support-01", kind="fault", expectedRevision=1))
    assert result["worldRevision"] == 2
    assert result["services"][0]["status"] == "unavailable"
    assert "Mobile support 01 is unavailable" in result["services"][0]["blockers"]
    assert result["services"][1]["status"] == "unavailable"
    replay = world.snapshot(1)
    assert replay["services"][0]["status"] == "available"
    assert replay["worldRevision"] == 1
    assert replay["latestRevision"] == 2
    assert replay["events"] == []


def test_event_store_survives_restart(tmp_path) -> None:
    from app.main import EventIn
    path = tmp_path / "world.sqlite"
    first = World(path)
    first.apply(EventIn(assetId="support-01", kind="fault", expectedRevision=1))
    restarted = World(path)
    assert restarted.snapshot()["worldRevision"] == 2
    assert all(service["status"] == "unavailable" for service in restarted.snapshot()["services"])


def test_api_health_and_scene() -> None:
    client = TestClient(app)
    assert client.get("/api/health").json()["status"] == "working"
    scene = client.get("/api/scene").json()
    assert scene["sourceKind"] == "simulated"
    assert len(scene["entities"]) == 4
    assert len(scene["services"]) == 2
