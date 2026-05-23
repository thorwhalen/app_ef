"""Enlace entry point for app_ef — re-exports the backend ASGI app.

The tw_platform / enlace stack discovers an app's backend by looking for an
entry-point module (``server.py`` / ``app.py`` / ``main.py``) at the **app
root** that exposes an ASGI object named ``app``. It then mounts that app under
``/api/app_ef``.

app_ef's actual backend is the ``app-ef-backend`` package in
``backend/app/main.py`` (kept there so the backend stays independently
testable — ``cd backend && uvicorn app.main:app``). This module is the thin
shim that bridges the two: it puts ``backend/`` on ``sys.path`` so ``app.main``
is importable, then re-exports its ``app``.

``ef`` and ``qh`` (which ``app.main`` imports) are installed into the server
venv from PyPI via ``app.toml``'s ``[python].packages`` — they resolve normally.
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.main import app  # noqa: E402  (sys.path is prepared just above)

__all__ = ["app"]
