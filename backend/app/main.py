from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
from threading import Lock
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .weather import PUBLIC_POINTS, WeatherService


class Position(BaseModel):
    longitudeDeg: float = Field(ge=-180, le=180)
    latitudeDeg: float = Field(ge=-90, le=90)
    altitudeDatum: Literal["WGS84_ELLIPSOID", "MSL", "AGL", "UNKNOWN"] = "UNKNOWN"


class Entity(BaseModel):
    id: str
    resourceId: str
    kind: Literal["fixed_wing", "multirotor", "ground_vehicle", "facility"]
    label: str
    position: Position
    headingDeg: float = 0
    condition: Literal["normal", "degraded", "unavailable"] = "normal"
    sourceKind: Literal["simulated"] = "simulated"
    stale: bool = False
    scenarioId: str = "synthetic-demo"
    worldRevision: int = 1
    modelVersion: str = "0.1.0"


class EventIn(BaseModel):
    assetId: str
    kind: Literal["fault", "repair"]
    expectedRevision: int = Field(ge=1)


class World:
    def __init__(self, db_path: Path | None = None) -> None:
        self.lock = Lock()
        self.db_path = db_path
        self.revision = 1
        self.entities = [
            Entity(id="uav-01", resourceId="asset-uav-01", kind="fixed_wing", label="Survey aircraft 01", position=Position(longitudeDeg=17.24, latitudeDeg=59.36), headingDeg=48),
            Entity(id="uav-02", resourceId="asset-uav-02", kind="multirotor", label="Inspection drone 02", position=Position(longitudeDeg=17.48, latitudeDeg=59.28), headingDeg=126),
            Entity(id="support-01", resourceId="asset-support-01", kind="ground_vehicle", label="Mobile support 01", position=Position(longitudeDeg=17.34, latitudeDeg=59.16), headingDeg=315),
            Entity(id="depot-01", resourceId="asset-depot-01", kind="facility", label="Service depot 01", position=Position(longitudeDeg=17.08, latitudeDeg=59.19)),
        ]
        self.initial_entities = deepcopy(self.entities)
        self.events: list[dict] = []
        if self.db_path is not None:
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.db_path) as connection:
                connection.execute("CREATE TABLE IF NOT EXISTS scene_events (world_revision INTEGER PRIMARY KEY, asset_id TEXT NOT NULL, kind TEXT NOT NULL, recorded_at TEXT NOT NULL)")
                rows = connection.execute("SELECT world_revision, asset_id, kind, recorded_at FROM scene_events ORDER BY world_revision").fetchall()
            for revision, asset_id, kind, recorded_at in rows:
                if revision != self.revision + 1:
                    raise RuntimeError("Event store contains a non-sequential world revision")
                entity = next((item for item in self.entities if item.id == asset_id), None)
                if entity is None or kind not in ("fault", "repair"):
                    raise RuntimeError("Event store contains an invalid scene event")
                entity.condition = "unavailable" if kind == "fault" else "normal"
                self.revision = revision
                self.events.append({"id": f"event-{revision}", "assetId": asset_id, "kind": kind, "worldRevision": revision, "recordedAt": recorded_at, "sourceKind": "simulated"})
            for entity in self.entities:
                entity.worldRevision = self.revision

    def snapshot(self, revision: int | None = None) -> dict:
        with self.lock:
            requested_revision = self.revision if revision is None else revision
            if not 1 <= requested_revision <= self.revision:
                raise HTTPException(404, "World revision not found")
            entities = deepcopy(self.initial_entities)
            visible_events = [event for event in self.events if event["worldRevision"] <= requested_revision]
            for event in visible_events:
                entity = next(item for item in entities if item.id == event["assetId"])
                entity.condition = "unavailable" if event["kind"] == "fault" else "normal"
            for entity in entities:
                entity.worldRevision = requested_revision
            service_definitions = [
                {"id": "survey-sector-alpha", "label": "Sector Alpha survey", "requiredEntityIds": ["uav-01", "support-01"], "area": [[17.00, 59.10], [17.57, 59.10], [17.57, 59.47], [17.00, 59.47], [17.00, 59.10]]},
                {"id": "inspection-sector-bravo", "label": "Sector Bravo inspection", "requiredEntityIds": ["uav-02", "support-01", "depot-01"], "area": [[17.19, 59.11], [17.66, 59.11], [17.66, 59.35], [17.19, 59.35], [17.19, 59.11]]},
            ]
            entity_index = {entity.id: entity for entity in entities}
            services = []
            for definition in service_definitions:
                required = [entity_index[entity_id] for entity_id in definition["requiredEntityIds"]]
                blockers = [f"{entity.label} is unavailable" for entity in required if entity.condition != "normal"]
                services.append({**definition, "status": "available" if not blockers else "unavailable", "blockers": blockers, "explanation": "Requires all listed assets to be operational."})
            return deepcopy({
                "scenarioId": "synthetic-demo",
                "worldRevision": requested_revision,
                "latestRevision": self.revision,
                "modelVersion": "0.1.0",
                "sourceKind": "simulated",
                "dataNotice": "Synthetic demonstration data. No live telemetry or organization data.",
                "entities": [e.model_dump() for e in entities],
                "services": services,
                "routes": [
                    {"id": "survey-route", "kind": "planned", "entityId": "uav-01", "coordinates": [[17.08, 59.16], [17.19, 59.26], [17.24, 59.36], [17.44, 59.39], [17.51, 59.27]]},
                    {"id": "support-route", "kind": "planned", "entityId": "support-01", "coordinates": [[17.08, 59.19], [17.20, 59.17], [17.34, 59.16]]},
                ],
                "events": visible_events,
            })

    def apply(self, event: EventIn) -> dict:
        with self.lock:
            if event.expectedRevision != self.revision:
                raise HTTPException(409, "World revision changed; refresh before applying an event")
            entity = next((e for e in self.entities if e.id == event.assetId), None)
            if entity is None:
                raise HTTPException(404, "Asset not found")
            next_revision = self.revision + 1
            recorded_at = datetime.now(timezone.utc).isoformat()
            if self.db_path is not None:
                with sqlite3.connect(self.db_path) as connection:
                    connection.execute("INSERT INTO scene_events (world_revision, asset_id, kind, recorded_at) VALUES (?, ?, ?, ?)", (next_revision, entity.id, event.kind, recorded_at))
            entity.condition = "unavailable" if event.kind == "fault" else "normal"
            self.revision = next_revision
            for item in self.entities:
                item.worldRevision = self.revision
            self.events.append({
                "id": f"event-{self.revision}",
                "assetId": entity.id,
                "kind": event.kind,
                "worldRevision": self.revision,
                "recordedAt": recorded_at,
                "sourceKind": "simulated",
            })
        return self.snapshot()


default_db_path = Path(__file__).parents[1] / "data" / "demo.sqlite"
world = World(Path(os.environ.get("TROSSOPS_DB_PATH", str(default_db_path))))
weather = WeatherService()
app = FastAPI(title="TrossOps Synthetic Scene API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["GET", "POST"], allow_headers=["*"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "working", "mode": "synthetic", "modelVersion": "0.1.0"}


@app.get("/api/scene")
def scene(revision: int | None = None) -> dict:
    return world.snapshot(revision)


@app.post("/api/events")
def apply_event(event: EventIn) -> dict:
    return world.apply(event)


@app.get("/api/environment/points")
def environment_points() -> dict:
    return {"source": "public city reference points", "points": PUBLIC_POINTS}


@app.get("/api/environment/forecast/{location}")
def environment_forecast(location: str) -> dict:
    if location not in PUBLIC_POINTS:
        raise HTTPException(404, "Forecast point not found")
    return weather.get(location)
