"""
Main FastAPI application for app_ef backend.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

from app.core.config import settings
from app.api.v1 import projects, sources, components, pipelines, results
from app.models.api_models import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print(f"Starting {settings.app_name} in {settings.environment} mode...")
    print(f"Storage backend: {settings.storage_backend}")

    yield

    # Shutdown
    print(f"Shutting down {settings.app_name}...")


# Create FastAPI application
app = FastAPI(
    title="app_ef API",
    description="API for ef (Embedding Flow) framework",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(
    projects.router, prefix=f"{settings.api_v1_prefix}/projects", tags=["projects"]
)
app.include_router(
    sources.router, prefix=settings.api_v1_prefix, tags=["sources"]
)
app.include_router(
    components.router, prefix=f"{settings.api_v1_prefix}/components", tags=["components"]
)
app.include_router(
    pipelines.router, prefix=settings.api_v1_prefix, tags=["pipelines"]
)
app.include_router(
    results.router, prefix=settings.api_v1_prefix, tags=["results"]
)


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to app_ef API",
        "version": "0.1.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


# Health check endpoint
@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy", version="0.1.0", timestamp=datetime.utcnow().isoformat()
    )
