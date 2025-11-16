"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


# ========================================
# Project Models
# ========================================


class ProjectCreate(BaseModel):
    """Request model for creating a new project."""

    name: str = Field(..., min_length=1, max_length=200, description="Project name")
    backend: str = Field(
        default="filesystem",
        description="Storage backend type",
        pattern="^(memory|filesystem|cloud)$",
    )
    description: Optional[str] = Field(
        None, max_length=1000, description="Project description"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "name": "My Embedding Project",
                "backend": "filesystem",
                "description": "A project for analyzing customer feedback",
            }
        }


class ProjectUpdate(BaseModel):
    """Request model for updating a project."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Updated Project Name",
                "description": "Updated description",
            }
        }


class ProjectResponse(BaseModel):
    """Response model for project data."""

    id: str
    name: str
    backend: str
    description: Optional[str] = None
    created_at: str
    updated_at: str
    source_count: int = 0
    pipeline_count: int = 0

    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc-123-def",
                "name": "My Project",
                "backend": "filesystem",
                "description": "A sample project",
                "created_at": "2025-11-16T12:00:00",
                "updated_at": "2025-11-16T12:30:00",
                "source_count": 10,
                "pipeline_count": 2,
            }
        }


class ProjectSummary(BaseModel):
    """Detailed project summary with statistics."""

    id: str
    name: str
    backend: str
    num_sources: int
    num_segments: int
    num_embeddings: int
    num_pipelines: int
    pipelines: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc-123-def",
                "name": "My Project",
                "backend": "filesystem",
                "num_sources": 10,
                "num_segments": 100,
                "num_embeddings": 100,
                "num_pipelines": 2,
                "pipelines": ["full_analysis", "quick_cluster"],
            }
        }


# ========================================
# Source Models
# ========================================


class SourceCreate(BaseModel):
    """Request model for adding a source."""

    key: str = Field(..., min_length=1, description="Unique source key/identifier")
    content: str = Field(..., min_length=1, description="Source text content")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Optional metadata for the source"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "key": "doc_001",
                "content": "This is the document content to be embedded.",
                "metadata": {"author": "John Doe", "date": "2025-11-16"},
            }
        }


class SourceResponse(BaseModel):
    """Response model for source data."""

    key: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "key": "doc_001",
                "content": "Document content here...",
                "metadata": {"author": "John Doe"},
                "created_at": "2025-11-16T12:00:00",
            }
        }


class BulkSourcesCreate(BaseModel):
    """Request model for bulk source upload."""

    sources: List[SourceCreate] = Field(..., min_length=1, max_length=1000)

    class Config:
        json_schema_extra = {
            "example": {
                "sources": [
                    {"key": "doc_001", "content": "First document"},
                    {"key": "doc_002", "content": "Second document"},
                ]
            }
        }


# ========================================
# Component Models
# ========================================


class ComponentList(BaseModel):
    """Response model for available components."""

    embedders: List[str]
    planarizers: List[str]
    clusterers: List[str]
    segmenters: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "embedders": ["simple", "char_counts"],
                "planarizers": ["simple_2d", "normalize_2d"],
                "clusterers": ["simple_kmeans", "threshold"],
                "segmenters": ["identity", "lines", "sentences"],
            }
        }


# ========================================
# Pipeline Models
# ========================================


class PipelineCreate(BaseModel):
    """Request model for creating a pipeline."""

    name: str = Field(..., min_length=1, max_length=100, description="Pipeline name")
    embedder: str = Field(..., description="Embedder component to use")
    planarizer: Optional[str] = Field(
        None, description="Planarizer component (for dimensionality reduction)"
    )
    clusterer: Optional[str] = Field(None, description="Clusterer component")
    num_clusters: Optional[int] = Field(
        None, ge=2, le=100, description="Number of clusters"
    )
    segmenter: str = Field(
        default="identity", description="Segmenter component to use"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        None, description="Additional pipeline parameters"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "name": "full_analysis",
                "embedder": "simple",
                "planarizer": "simple_2d",
                "clusterer": "simple_kmeans",
                "num_clusters": 5,
                "segmenter": "sentences",
            }
        }


class PipelineResponse(BaseModel):
    """Response model for pipeline data."""

    name: str
    embedder: str
    planarizer: Optional[str] = None
    clusterer: Optional[str] = None
    num_clusters: Optional[int] = None
    segmenter: str
    parameters: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None


class PipelineExecution(BaseModel):
    """Response model for pipeline execution status."""

    execution_id: str
    pipeline_name: str
    status: str = Field(
        ..., description="Execution status: pending, running, completed, failed"
    )
    progress: float = Field(..., ge=0.0, le=1.0, description="Progress from 0 to 1")
    message: Optional[str] = Field(None, description="Current status message")
    started_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "execution_id": "exec-123-abc",
                "pipeline_name": "full_analysis",
                "status": "running",
                "progress": 0.75,
                "message": "Processing embeddings...",
                "started_at": "2025-11-16T12:00:00",
            }
        }


# ========================================
# Results Models
# ========================================


class SegmentResult(BaseModel):
    """Segment data."""

    key: str
    content: str


class EmbeddingResult(BaseModel):
    """Embedding data."""

    key: str
    vector: List[float]


class PlanarEmbeddingResult(BaseModel):
    """Planar (2D/3D) embedding data."""

    key: str
    coordinates: List[float]


class ClusterResult(BaseModel):
    """Cluster assignment data."""

    key: str
    cluster_id: int


class VisualizationData(BaseModel):
    """Optimized data for visualization."""

    embeddings: List[List[float]] = Field(..., description="2D or 3D coordinates")
    clusters: Optional[List[int]] = Field(None, description="Cluster assignments")
    labels: Optional[List[str]] = Field(None, description="Labels for each point")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional visualization metadata"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "embeddings": [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]],
                "clusters": [0, 1, 0],
                "labels": ["doc_001", "doc_002", "doc_003"],
                "metadata": {"num_clusters": 2},
            }
        }


# ========================================
# Quick Operations Models
# ========================================


class QuickEmbedRequest(BaseModel):
    """Request model for quick embedding."""

    text: str = Field(..., min_length=1, description="Text to embed")
    embedder: Optional[str] = Field(None, description="Embedder to use (optional)")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "This is a sample text to embed quickly.",
                "embedder": "simple",
            }
        }


class QuickEmbedResponse(BaseModel):
    """Response model for quick embedding."""

    text: str
    embedding: List[float]
    embedder: str

    class Config:
        json_schema_extra = {
            "example": {
                "text": "Sample text",
                "embedding": [0.1, 0.2, 0.3, 0.4, 0.5],
                "embedder": "simple",
            }
        }


# ========================================
# Generic Response Models
# ========================================


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
    detail: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    timestamp: str
