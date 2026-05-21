"""Smoke tests for the app_ef backend.

The backend is pure transport over :class:`ef.service.EfService`, so these
tests verify the *wiring* — the seven service methods are reachable, responses
serialize (notably ``search``, whose ``SearchHit`` is a dataclass), CORS is
applied, and the ``EfService`` is injectable — not the embedding/search logic
itself (that is tested in ``ef``).
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from ef.service import EfService

from app.main import (
    FALLBACK_EMBEDDER,
    MODEL_EMBEDDER,
    SERVICE_METHODS,
    _resolve_default_embedder,
    build_app,
)

# A tiny corpus reused across the lifecycle tests.
SOURCES = ["the cat sat on the mat", "dogs are loyal", "felines and canines"]


def _client(**build_kwargs) -> TestClient:
    """A TestClient over a freshly built app.

    Defaults to the dependency-free ``hashing`` embedder so these smoke tests
    never reach a network embedding backend — regardless of the ambient
    ``OPENAI_API_KEY`` / ``APP_EF_EMBEDDER`` environment, which would otherwise
    make ``_resolve_default_embedder`` pick the OpenAI model embedder.
    """
    build_kwargs.setdefault("default_embedder", "hashing")
    return TestClient(build_app(**build_kwargs))


def test_build_app_exposes_all_service_routes():
    """build_app() wires every EfService method plus the /health probe."""
    app = build_app()
    assert isinstance(app, FastAPI)

    paths = {route.path for route in app.routes if hasattr(route, "path")}
    for method_name in SERVICE_METHODS:
        assert f"/{method_name}" in paths, f"missing route for {method_name}"
    assert "/health" in paths
    # qh contributes the OpenAPI surface.
    assert "/openapi.json" in paths
    assert "/docs" in paths


def test_health():
    """The liveness probe returns a plain ok status."""
    response = _client().get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_corpus_lifecycle():
    """create -> search -> retrieve -> info -> list -> delete, end to end."""
    client = _client()

    created = client.post(
        "/create_corpus", json={"sources": SOURCES, "corpus_id": "animals"}
    )
    assert created.status_code == 200
    assert created.json()["corpus_id"] == "animals"
    assert created.json()["n_sources"] == 3

    # search returns SearchHit dataclasses — exercises the qh jsonable_encoder fix.
    found = client.post(
        "/search", json={"corpus_id": "animals", "query": "cat", "limit": 2}
    )
    assert found.status_code == 200
    hits = found.json()
    assert len(hits) == 2
    assert set(hits[0]) == {"segment", "score", "source_id"}
    assert isinstance(hits[0]["score"], float)

    retrieved = client.post(
        "/retrieve", json={"corpus_id": "animals", "query": "cat", "limit": 2}
    )
    assert retrieved.status_code == 200
    assert isinstance(retrieved.json()[0]["text"], str)

    info = client.post("/corpus_info", json={"corpus_id": "animals"})
    assert info.status_code == 200
    assert info.json()["corpus_id"] == "animals"

    listed = client.post("/list_corpora", json={})
    assert listed.status_code == 200
    assert [c["corpus_id"] for c in listed.json()] == ["animals"]

    deleted = client.post("/delete_corpus", json={"corpus_id": "animals"})
    assert deleted.status_code == 200
    assert client.post("/list_corpora", json={}).json() == []


def test_explore_corpus():
    """explore_corpus returns the row-aligned corpus-map shape."""
    client = _client()
    client.post("/create_corpus", json={"sources": SOURCES, "corpus_id": "c"})

    explored = client.post("/explore_corpus", json={"corpus_id": "c"})
    assert explored.status_code == 200
    result = explored.json()
    assert set(result) == {"ids", "coords", "labels", "cluster_titles"}
    assert len(result["ids"]) == len(result["coords"]) == len(result["labels"])


def test_cors_header_present_for_default_origin():
    """A request from a default frontend origin gets the CORS allow header."""
    response = _client().get(
        "/health", headers={"Origin": "http://localhost:5173"}
    )
    assert response.headers.get("access-control-allow-origin") == (
        "http://localhost:5173"
    )


def test_cors_origins_are_configurable():
    """build_app(cors_origins=...) overrides the default allowlist."""
    client = _client(cors_origins=["https://frontend.example"])

    allowed = client.get(
        "/health", headers={"Origin": "https://frontend.example"}
    )
    assert allowed.headers.get("access-control-allow-origin") == (
        "https://frontend.example"
    )

    # A default origin is no longer allowed once a custom list is given.
    rejected = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert "access-control-allow-origin" not in rejected.headers


def test_service_is_injectable():
    """A pre-seeded EfService can be injected — the registry is on the instance."""
    service = EfService()  # no args → the offline hashing default
    service.create_corpus(SOURCES, corpus_id="seeded")

    client = TestClient(build_app(service=service))
    listed = client.post("/list_corpora", json={})
    assert [c["corpus_id"] for c in listed.json()] == ["seeded"]


# ---------------------------------------------------------------------------
# default embedder — the start-up semantic-search policy
# ---------------------------------------------------------------------------


def test_resolve_default_embedder_honours_explicit_override(monkeypatch):
    """APP_EF_EMBEDDER wins over the OpenAI-key auto-resolution."""
    monkeypatch.setenv("APP_EF_EMBEDDER", "cohere:embed-v3")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-irrelevant")
    assert _resolve_default_embedder() == "cohere:embed-v3"


def test_resolve_default_embedder_picks_model_when_key_present(monkeypatch):
    """With an OpenAI key and no override, the model embedder is the default."""
    monkeypatch.delenv("APP_EF_EMBEDDER", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-irrelevant")
    assert _resolve_default_embedder() == MODEL_EMBEDDER


def test_resolve_default_embedder_falls_back_to_hashing_and_warns(monkeypatch):
    """With no key and no override, it falls back to hashing — loudly."""
    monkeypatch.delenv("APP_EF_EMBEDDER", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.warns(RuntimeWarning, match="word overlap"):
        assert _resolve_default_embedder() == FALLBACK_EMBEDDER


def test_build_app_default_embedder_is_used_for_new_corpora():
    """build_app(default_embedder=...) sets the embedder new corpora resolve."""
    client = _client(default_embedder="hashing")
    client.post("/create_corpus", json={"sources": SOURCES, "corpus_id": "c"})
    info = client.post("/corpus_info", json={"corpus_id": "c"}).json()
    assert info["embedder"] == "hashing:v1@512"
