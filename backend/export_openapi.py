"""Export the backend's OpenAPI document to the frontend.

The frontend's API types are **generated** from this document (via
``openapi-typescript`` — see ``frontend/package.json``'s ``gen:api`` script),
not hand-written. ``qh`` derives a complete OpenAPI schema — request bodies,
responses and ``components.schemas`` — from :class:`ef.service.EfService`'s
Python type hints, so this file is the single source of truth for the
frontend's view of the API.

Run it whenever the backend API surface changes::

    cd backend && python export_openapi.py

It writes ``frontend/src/api/openapi.json``; regenerate the TypeScript types
afterwards with ``cd frontend && pnpm gen:api``.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.main import build_app

#: Where the spec is written — ``frontend/src/api/openapi.json``, resolved
#: relative to this script so it works from any working directory.
SPEC_PATH = (
    Path(__file__).resolve().parent.parent
    / "frontend"
    / "src"
    / "api"
    / "openapi.json"
)


def export_openapi(spec_path: Path = SPEC_PATH) -> Path:
    """Build the app, render its OpenAPI document and write it to ``spec_path``.

    Returns the path written, for logging / scripting.
    """
    spec = build_app().openapi()
    spec_path.parent.mkdir(parents=True, exist_ok=True)
    spec_path.write_text(json.dumps(spec, indent=2) + "\n")
    return spec_path


if __name__ == "__main__":
    written = export_openapi()
    print(f"Wrote OpenAPI spec to {written}")
