from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from threading import Lock
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


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
    def __init__(self) -> None:
        self.lock = Lock()
        self.revision = 1
        self.entities = [
            Entity(id="uav-01", resourceId="asset-uav-01", kind="fixed_wing", label="Survey aircraft 01", position=Position(longitudeDeg=17.24, latitudeDeg=59.36), headingDeg=48),
            Entity(id="uav-02", resourceId="asset-uav-02", kind="multirotor", label="Inspection drone 02", position=Position(longitudeDeg=17.48, latitudeDeg=59.28), headingDeg=126),
            Entity(id="support-01", resourceId="asset-support-01", kind="ground_vehicle", label="Mobile support 01", position=Position(longitudeDeg=17.34, latitudeDeg=59.16), headingDeg=315),
            Entity(id="depot-01", resourceId="asset-depot-01", kind="facility", label="Service depot 01", position=Position(longitudeDeg=17.08, latitudeDeg=59.19)),
        ]
        self.initial_entities = deepcopy(self.entities)
        self.events: list[dict] = []

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
            entity.condition = "unavailable" if event.kind == "fault" else "normal"
            self.revision += 1
            for item in self.entities:
                item.worldRevision = self.revision
            self.events.append({
                "id": f"event-{self.revision}",
                "assetId": entity.id,
                "kind": event.kind,
                "worldRevision": self.revision,
                "recordedAt": datetime.now(timezone.utc).isoformat(),
                "sourceKind": "simulated",
            })
        return self.snapshot()


world = World()
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
