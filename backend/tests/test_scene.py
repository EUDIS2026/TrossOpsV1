from fastapi.testclient import TestClient
from fastapi import HTTPException
import pytest

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


def test_stale_revision_rejects_command_without_changing_world() -> None:
    from app.main import EventIn
    world = World()
    with pytest.raises(HTTPException) as error:
        world.apply(EventIn(assetId="uav-01", kind="fault", expectedRevision=2))
    assert error.value.status_code == 409
    assert world.snapshot()["worldRevision"] == 1


def test_api_health_and_scene() -> None:
    client = TestClient(app)
    assert client.get("/api/health").json()["status"] == "working"
    scene = client.get("/api/scene").json()
    assert scene["sourceKind"] == "simulated"
    assert len(scene["entities"]) == 4
    assert len(scene["services"]) == 2


def test_preview_shows_service_impact_without_mutating_world() -> None:
    from app.main import PreviewIn
    world = World()
    before = world.snapshot()
    result = world.preview(PreviewIn(assetId="support-01", kind="fault", baseRevision=1))
    assert result["candidate"]["previewKind"] == "hypothetical"
    assert result["candidate"]["entities"][2]["condition"] == "unavailable"
    assert {item["serviceId"] for item in result["impacts"]} == {"survey-sector-alpha", "inspection-sector-bravo"}
    assert all(item["after"] == "unavailable" for item in result["impacts"])
    assert world.snapshot() == before
    assert world.revision == 1
