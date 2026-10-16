import pytest
from fastapi.testclient import TestClient

from app import advisor
from app.main import World, app


def test_advisor_facts_follow_requested_revision():
    world = World()
    first = world.snapshot(1)
    facts = advisor.scene_facts(first, "survey-sector-alpha")
    assert facts["worldRevision"] == 1
    assert facts["service"]["status"] == "available"
    assert {item["id"] for item in facts["requiredEntities"]} == {"uav-01", "support-01"}
    assert all(item["sourceKind"] == "simulated" for item in facts["requiredEntities"])
    with pytest.raises(KeyError):
        advisor.scene_facts(first, "missing")


def test_advisor_output_extraction_skips_nontext_items():
    result = {"output": [
        {"type": "reasoning", "content": []},
        {"type": "message", "content": [{"type": "output_text", "text": "Synthetic service is available."}]},
    ]}
    assert advisor.extract_text(result) == "Synthetic service is available."
    with pytest.raises(ValueError):
        advisor.extract_text({"output": []})


def test_advisor_is_disabled_without_configuration(monkeypatch):
    monkeypatch.delenv("TROSSOPS_ENABLE_LLM", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("TROSSOPS_LLM_MODEL", raising=False)
    monkeypatch.delenv("TROSSOPS_LLM_ACCESS_TOKEN", raising=False)
    assert advisor.status()["status"] == "adapter-only"
    with pytest.raises(RuntimeError):
        advisor.analyze({"worldRevision": 1, "service": {"id": "x"}})
    client = TestClient(app)
    assert client.get("/api/analysis/status").json()["status"] == "adapter-only"
    response = client.post("/api/analysis/service", json={"serviceId": "survey-sector-alpha", "worldRevision": 1})
    assert response.status_code == 503


def test_advisor_rejects_missing_access_token(monkeypatch):
    monkeypatch.setenv("TROSSOPS_ENABLE_LLM", "1")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    monkeypatch.setenv("TROSSOPS_LLM_MODEL", "test-model")
    monkeypatch.setenv("TROSSOPS_LLM_ACCESS_TOKEN", "test-secret")
    client = TestClient(app)
    assert client.get("/api/analysis/status").json()["status"] == "configured"
    response = client.post("/api/analysis/service", json={"serviceId": "survey-sector-alpha", "worldRevision": 1})
    assert response.status_code == 401
