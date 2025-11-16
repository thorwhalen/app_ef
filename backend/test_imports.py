#!/usr/bin/env python3
"""
Simple test to verify all modules can be imported.
"""
import sys

print("Testing imports...")

try:
    print("✓ Importing FastAPI...")
    from fastapi import FastAPI

    print("✓ Importing app modules...")
    from app.main import app
    from app.core.config import settings
    from app.core.storage import get_storage_backend
    from app.core.ef_wrapper import EFProjectWrapper
    from app.core.auth import create_access_token

    print("✓ Importing API modules...")
    from app.api.v1 import projects, sources, components, pipelines, results, auth
    from app.api import websockets

    print("✓ Importing models...")
    from app.models.api_models import ProjectCreate, SourceCreate, PipelineCreate

    print("\n✅ All imports successful!")
    print(f"FastAPI app created: {app.title}")
    print(f"Storage backend: {settings.storage_backend}")
    print(f"Auth enabled: {settings.enable_auth}")

    sys.exit(0)

except Exception as e:
    print(f"\n❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
