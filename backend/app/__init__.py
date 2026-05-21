"""``app_ef`` backend — a thin HTTP transport over :mod:`ef`.

The backend adds no logic of its own: it exposes :class:`ef.service.EfService`'s
methods over HTTP via :func:`qh.mk_app`. All embedding / search / indexing logic
lives in ``ef`` (group policy: ``app_ef`` is presentation only). See
:mod:`app.main` for the single :func:`~app.main.build_app` entry point.
"""

__version__ = "0.2.0"
