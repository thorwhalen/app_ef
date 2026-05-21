"""The ``app_ef`` backend — wires :class:`ef.service.EfService` to HTTP.

``app_ef`` is UI-only over ``ef`` (group policy: all logic lives in ``ef``,
``app_ef`` is presentation). This module is the *whole* backend — pure
transport, no orchestration:

* one :class:`~ef.service.EfService` is constructed per process; it holds the
  live ``{corpus_id: SourceManager}`` registry,
* its seven JSON-friendly methods are handed to :func:`qh.mk_app`, which derives
  the HTTP routes, request schema and OpenAPI spec from their type hints,
* CORS is enabled so the browser frontend can call the API.

No persistence and no auth this round: corpora are in-memory and per-process —
a server restart drops them.

Run it::

    cd backend && uvicorn app.main:app --reload

``ef`` and ``qh`` are local editable installs (the embeddings package group);
they are never ``pip install``ed.
"""

from __future__ import annotations

import os
from collections.abc import Sequence

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ef.service import EfService
from qh import mk_app

__all__ = ["build_app", "app"]

#: Frontend dev-server origins allowed by default (Vite: 5173, CRA: 3000).
DEFAULT_CORS_ORIGINS: tuple[str, ...] = (
    "http://localhost:5173",
    "http://localhost:3000",
)

#: Env var holding a comma-separated CORS origin allowlist (overrides the default).
CORS_ORIGINS_ENVVAR = "APP_EF_CORS_ORIGINS"

#: The :class:`~ef.service.EfService` methods exposed over HTTP, in API order.
SERVICE_METHODS: tuple[str, ...] = (
    "create_corpus",
    "search",
    "retrieve",
    "explore_corpus",
    "corpus_info",
    "list_corpora",
    "delete_corpus",
)


def _env_cors_origins() -> tuple[str, ...] | None:
    """Parse the CORS allowlist from the environment, or ``None`` if unset."""
    raw = os.environ.get(CORS_ORIGINS_ENVVAR, "").strip()
    if not raw:
        return None
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


def build_app(
    service: EfService | None = None,
    *,
    cors_origins: Sequence[str] | None = None,
) -> FastAPI:
    """Build the ``app_ef`` FastAPI backend.

    Args:
        service: the :class:`~ef.service.EfService` to expose. ``None`` → a
            fresh one (the production default — one corpus registry per
            process). Injectable so tests can pass a pre-seeded service.
        cors_origins: the CORS origin allowlist. ``None`` → the
            ``APP_EF_CORS_ORIGINS`` env var if set, else
            :data:`DEFAULT_CORS_ORIGINS`.

    Returns:
        a :class:`~fastapi.FastAPI` app exposing the seven ``EfService``
        endpoints, with CORS, a ``/health`` check and the ``qh``-generated
        ``/docs`` + ``/openapi.json``.
    """
    service = service if service is not None else EfService()
    origins = list(
        cors_origins
        if cors_origins is not None
        else _env_cors_origins() or DEFAULT_CORS_ORIGINS
    )

    base = FastAPI(
        title="app_ef API",
        description="HTTP transport over ef.EfService — semantic-search corpora.",
        version="0.2.0",
    )
    base.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @base.get("/health", tags=["ops"])
    def health() -> dict[str, str]:
        """Liveness probe — used by the Docker healthcheck."""
        return {"status": "ok"}

    methods = [getattr(service, name) for name in SERVICE_METHODS]
    return mk_app(methods, app=base)


#: The ASGI app served in production — ``uvicorn app.main:app``.
app = build_app()
