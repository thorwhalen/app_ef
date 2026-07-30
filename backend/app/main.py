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

The embedder a new corpus uses when the request names none is resolved once at
start-up by :func:`_resolve_default_embedder`: ``openai:text-embedding-3-small``
when ``OPENAI_API_KEY`` is set (real semantic search out of the box), else the
dependency-free ``hashing`` embedder (lexical word overlap). Set
``APP_EF_EMBEDDER`` to override.

**Bring-your-own-key.** ``create_corpus`` also accepts the caller's *own* OpenAI
key, supplied in the ``X-OpenAI-Key`` request header — mapped onto
:meth:`ef.service.EfService.create_corpus`'s ``embedder_api_key`` parameter. The
key builds that corpus's embedder and is never stored; being header-mapped it
stays out of the JSON body *and* the OpenAPI schema. With no header and no
server-side ``OPENAI_API_KEY``, new corpora fall back to the ``hashing``
embedder — the service runs keyless and degrades to lexical search rather than
failing. This is how ``app_ef`` is deployed: no server key, every caller brings
their own.

Run it::

    cd backend && uvicorn app.main:app --reload

``ef`` and ``qh`` are local editable installs (the embeddings package group);
they are never ``pip install``ed.
"""

from __future__ import annotations

import os
import warnings
from collections.abc import Sequence

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ef.service import EfService
from qh import HttpLocation, TransformSpec, mk_app

__all__ = ["build_app", "app"]

#: Frontend dev-server origins allowed by default (Vite: 5173, CRA: 3000).
DEFAULT_CORS_ORIGINS: tuple[str, ...] = (
    "http://localhost:5173",
    "http://localhost:3000",
)

#: Env var holding a comma-separated CORS origin allowlist (overrides the default).
CORS_ORIGINS_ENVVAR = "APP_EF_CORS_ORIGINS"

#: Env var naming the embedder new corpora use when the request names none —
#: an explicit operator override, any string ``ef``'s DI seam resolves.
EMBEDDER_ENVVAR = "APP_EF_EMBEDDER"

#: Env var the OpenAI SDK reads for its key; its presence enables the model
#: embedder as the auto-resolved default.
OPENAI_KEY_ENVVAR = "OPENAI_API_KEY"

#: The embedder used for real semantic search when an OpenAI key is available.
MODEL_EMBEDDER = "openai:text-embedding-3-small"

#: HTTP request header carrying the caller's own OpenAI key — the
#: bring-your-own-key seam. Mapped onto ``create_corpus``'s ``embedder_api_key``
#: parameter; being header-located it never enters the JSON body or the
#: OpenAPI schema.
OPENAI_KEY_HEADER = "X-OpenAI-Key"

#: The dependency-free lexical embedder — the fallback when no model is available.
FALLBACK_EMBEDDER = "hashing"

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


def _resolve_default_embedder() -> str:
    """Pick the embedder new corpora use when a ``create_corpus`` names none.

    ``ef`` keeps a dependency-free ``hashing`` embedder as *its* default — but
    hashing matches word overlap, not meaning. ``app_ef`` is an embedding-search
    app, so it resolves a *semantic* default at start-up, in this order:

    1. the :data:`EMBEDDER_ENVVAR` (``APP_EF_EMBEDDER``) env var, if set — an
       explicit operator override (any string ``ef``'s DI seam resolves:
       ``"hashing"``, ``"cohere:..."``, an ``http(s)://`` URL, …);
    2. else :data:`MODEL_EMBEDDER` (``openai:text-embedding-3-small``) when an
       ``OPENAI_API_KEY`` is present — real semantic search out of the box;
    3. else :data:`FALLBACK_EMBEDDER` (``hashing``) — the dependency-free lexical
       fallback, emitting a :class:`RuntimeWarning` so the degraded mode is loud.

    Returns:
        the embedder string handed to :class:`~ef.service.EfService` as its
        per-instance ``default_embedder``.
    """
    explicit = os.environ.get(EMBEDDER_ENVVAR, "").strip()
    if explicit:
        return explicit
    if os.environ.get(OPENAI_KEY_ENVVAR, "").strip():
        return MODEL_EMBEDDER
    warnings.warn(
        f"Neither {OPENAI_KEY_ENVVAR} nor {EMBEDDER_ENVVAR} is set — new corpora "
        f"will use the {FALLBACK_EMBEDDER!r} embedder, which matches word overlap, "
        f"not meaning. Set {OPENAI_KEY_ENVVAR} for real semantic search, or set "
        f"{EMBEDDER_ENVVAR} to choose another embedder.",
        RuntimeWarning,
        stacklevel=2,
    )
    return FALLBACK_EMBEDDER


def build_app(
    service: EfService | None = None,
    *,
    default_embedder: str | None = None,
    cors_origins: Sequence[str] | None = None,
) -> FastAPI:
    """Build the ``app_ef`` FastAPI backend.

    Args:
        service: the :class:`~ef.service.EfService` to expose. ``None`` → a
            fresh one (the production default — one corpus registry per
            process). Injectable so tests can pass a pre-seeded service; an
            injected service carries its own ``default_embedder``, so
            ``default_embedder`` below is ignored when ``service`` is given.
        default_embedder: the embedder new corpora use when the request names
            none. ``None`` → :func:`_resolve_default_embedder` (the production
            default — a model embedder when an OpenAI key is present). Only
            consulted when ``service`` is ``None``.
        cors_origins: the CORS origin allowlist. ``None`` → the
            ``APP_EF_CORS_ORIGINS`` env var if set, else
            :data:`DEFAULT_CORS_ORIGINS`.

    Returns:
        a :class:`~fastapi.FastAPI` app exposing the seven ``EfService``
        endpoints, with CORS, a ``/health`` check and the ``qh``-generated
        ``/docs`` + ``/openapi.json``.
    """
    if service is None:
        embedder = (
            default_embedder
            if default_embedder is not None
            else _resolve_default_embedder()
        )
        service = EfService(default_embedder=embedder)
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

    # Every service method is exposed with default routing, except
    # create_corpus: its `embedder_api_key` parameter is mapped to the
    # X-OpenAI-Key request header — the bring-your-own-key seam. A header
    # mapping keeps the key out of the JSON body and the OpenAPI schema.
    methods = {getattr(service, name): {} for name in SERVICE_METHODS}
    methods[service.create_corpus] = {
        "param_overrides": {
            "embedder_api_key": TransformSpec(
                http_location=HttpLocation.HEADER,
                http_name=OPENAI_KEY_HEADER,
            ),
        },
    }
    return mk_app(methods, app=base)


#: The ASGI app served in production — ``uvicorn app.main:app``.
app = build_app()
