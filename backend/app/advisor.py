"""Optional, explicitly enabled OpenAI Responses adapter for synthetic scene analysis."""

from __future__ import annotations

import json
import os

import httpx


INSTRUCTIONS = """You are a TrossOps synthetic exercise analyst.
Use only the JSON scene facts provided. Every operational entity, route, and service is simulated.
Explain the selected service state, its blockers, and the evidence at the given world revision.
Keep the answer under 180 words. State that this is exercise data.
Never imply real Swedish military activity, live telemetry, asset readiness, or a safety guarantee.
If facts do not support a claim, say that they do not establish it."""


def status() -> dict:
    configured = bool(
        os.environ.get("TROSSOPS_ENABLE_LLM") == "1"
        and os.environ.get("OPENAI_API_KEY")
        and os.environ.get("TROSSOPS_LLM_MODEL")
        and os.environ.get("TROSSOPS_LLM_ACCESS_TOKEN")
    )
    return {
        "status": "configured" if configured else "adapter-only",
        "provider": "OpenAI Responses API",
        "model": os.environ.get("TROSSOPS_LLM_MODEL") if configured else None,
        "notice": "Model-generated analysis of synthetic exercise facts only." if configured
                  else "Set TROSSOPS_ENABLE_LLM=1, OPENAI_API_KEY, TROSSOPS_LLM_MODEL, and TROSSOPS_LLM_ACCESS_TOKEN on the server to enable paid analysis.",
    }


def scene_facts(scene: dict, service_id: str) -> dict:
    service = next((item for item in scene["services"] if item["id"] == service_id), None)
    if service is None:
        raise KeyError(service_id)
    required = [
        {"id": item["id"], "label": item["label"], "condition": item["condition"], "sourceKind": item["sourceKind"]}
        for item in scene["entities"] if item["id"] in service["requiredEntityIds"]
    ]
    return {
        "sourceKind": "simulated",
        "scenarioId": scene["scenarioId"],
        "worldRevision": scene["worldRevision"],
        "modelVersion": scene["modelVersion"],
        "service": {"id": service["id"], "label": service["label"], "status": service["status"],
                    "requiredEntityIds": service["requiredEntityIds"], "blockers": service["blockers"]},
        "requiredEntities": required,
    }


def extract_text(response: dict) -> str:
    parts = [
        content["text"]
        for item in response.get("output", [])
        if item.get("type") == "message"
        for content in item.get("content", [])
        if content.get("type") == "output_text" and isinstance(content.get("text"), str)
    ]
    if not parts:
        raise ValueError("Model returned no text")
    return "\n".join(parts).strip()


def analyze(facts: dict) -> dict:
    config = status()
    if config["status"] != "configured":
        raise RuntimeError("LLM adapter is not configured")
    payload = {
        "model": config["model"],
        "instructions": INSTRUCTIONS,
        "input": json.dumps(facts, separators=(",", ":")),
        "max_output_tokens": 350,
        "store": False,
    }
    with httpx.Client(timeout=45.0) as client:
        response = client.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
            json=payload,
        )
        response.raise_for_status()
        answer = extract_text(response.json())
    return {
        "status": "generated",
        "provider": "OpenAI Responses API",
        "model": config["model"],
        "sourceKind": "model-generated",
        "worldRevision": facts["worldRevision"],
        "serviceId": facts["service"]["id"],
        "answer": answer,
        "notice": "AI-generated interpretation of synthetic exercise facts. Verify against the source scene.",
    }
