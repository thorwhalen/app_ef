# app_ef Technical Architecture

## Overview

This document provides detailed technical specifications for implementing app_ef, complementing the high-level implementation plan.

---

## 1. Backend Technical Specifications

### 1.1 FastAPI Application Structure

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.v1 import projects, sources, pipelines, results, components
from app.core.config import settings
from app.middleware.error_handler import add_exception_handlers

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources
    await initialize_storage()
    await initialize_task_queue()
    yield
    # Shutdown: Cleanup resources
    await cleanup_resources()

app = FastAPI(
    title="app_ef API",
    description="API for ef embedding framework",
    version="1.0.0",
    lifespan=lifespan
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
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(sources.router, prefix="/api/v1", tags=["sources"])
app.include_router(pipelines.router, prefix="/api/v1", tags=["pipelines"])
app.include_router(results.router, prefix="/api/v1", tags=["results"])
app.include_router(components.router, prefix="/api/v1/components", tags=["components"])

# Add exception handlers
add_exception_handlers(app)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
```

### 1.2 Configuration Management

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache

class Settings(BaseSettings):
    # App
    app_name: str = "app_ef"
    debug: bool = False
    environment: str = "local"  # local, development, staging, production

    # API
    api_v1_prefix: str = "/api/v1"
    allowed_origins: List[str] = ["http://localhost:3000"]

    # Storage
    storage_backend: str = "filesystem"  # filesystem, s3, gcs
    local_storage_path: str = "./data/projects"
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = None
    gcs_bucket: Optional[str] = None

    # Database
    database_url: str = "sqlite:///./app_ef.db"
    database_pool_size: int = 5

    # Authentication
    enable_auth: bool = False
    jwt_secret_key: Optional[str] = None
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Task Queue
    redis_url: Optional[str] = None
    task_queue_enabled: bool = False

    # Monitoring
    enable_metrics: bool = False
    log_level: str = "INFO"

    # Limits
    max_upload_size_mb: int = 100
    max_sources_per_project: int = 10000
    max_concurrent_pipelines: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

### 1.3 EF Wrapper Layer

```python
# backend/app/core/ef_wrapper.py
from typing import Dict, List, Any, Optional
from pathlib import Path
import ef
from app.core.storage import get_storage_backend

class EFProjectWrapper:
    """Wrapper around ef.Project with enhanced functionality for API usage"""

    def __init__(self, project_id: str, project_name: str, backend: str = "filesystem"):
        self.project_id = project_id
        self.project_name = project_name
        self.backend_type = backend
        self.storage = get_storage_backend()
        self._project: Optional[ef.Project] = None

    async def initialize(self) -> None:
        """Initialize or load the ef project"""
        project_path = await self.storage.get_project_path(self.project_id)

        if await self.storage.project_exists(self.project_id):
            # Load existing project
            self._project = ef.Project.load(project_path)
        else:
            # Create new project
            self._project = ef.Project.create(
                self.project_name,
                backend=self.backend_type,
                root_dir=project_path
            )
            await self.storage.save_project_metadata(
                self.project_id,
                {"name": self.project_name, "backend": self.backend_type}
            )

    @property
    def project(self) -> ef.Project:
        if self._project is None:
            raise RuntimeError("Project not initialized. Call initialize() first.")
        return self._project

    async def add_source(self, key: str, content: str, metadata: Optional[Dict] = None) -> None:
        """Add a source document to the project"""
        self.project.add_source(key, content)
        if metadata:
            await self.storage.save_source_metadata(self.project_id, key, metadata)

    async def list_sources(self) -> List[str]:
        """List all source keys"""
        return list(self.project.sources.keys())

    async def get_source(self, key: str) -> str:
        """Get source content by key"""
        return self.project.sources[key]

    async def remove_source(self, key: str) -> None:
        """Remove a source from the project"""
        del self.project.sources[key]
        await self.storage.delete_source_metadata(self.project_id, key)

    async def list_available_components(self) -> Dict[str, List[str]]:
        """List all available components"""
        return {
            "embedders": list(self.project.list_components().get("embedders", {}).keys()),
            "planarizers": list(self.project.list_components().get("planarizers", {}).keys()),
            "clusterers": list(self.project.list_components().get("clusterers", {}).keys()),
            "segmenters": list(self.project.list_components().get("segmenters", {}).keys()),
        }

    async def create_pipeline(
        self,
        name: str,
        embedder: str,
        planarizer: Optional[str] = None,
        clusterer: Optional[str] = None,
        num_clusters: Optional[int] = None,
        segmenter: str = "identity",
        **kwargs
    ) -> None:
        """Create a new pipeline"""
        pipeline_config = {
            "embedder": embedder,
            "segmenter": segmenter,
        }

        if planarizer:
            pipeline_config["planarizer"] = planarizer

        if clusterer:
            pipeline_config["clusterer"] = clusterer
            if num_clusters:
                pipeline_config["num_clusters"] = num_clusters

        pipeline_config.update(kwargs)

        self.project.create_pipeline(name, **pipeline_config)
        await self.storage.save_pipeline_metadata(self.project_id, name, pipeline_config)

    async def list_pipelines(self) -> List[str]:
        """List all pipeline names"""
        return list(self.project.list_pipelines())

    async def get_pipeline_config(self, name: str) -> Dict[str, Any]:
        """Get pipeline configuration"""
        return await self.storage.load_pipeline_metadata(self.project_id, name)

    async def run_pipeline(self, name: str, progress_callback: Optional[callable] = None) -> None:
        """Execute a pipeline"""
        # TODO: Add progress tracking
        self.project.run_pipeline(name)

    async def get_results(self) -> Dict[str, Any]:
        """Get all results from the project"""
        return {
            "segments": dict(self.project.segments),
            "embeddings": dict(self.project.embeddings),
            "planar_embeddings": dict(self.project.planar_embeddings) if hasattr(self.project, "planar_embeddings") else {},
            "clusters": dict(self.project.clusters) if hasattr(self.project, "clusters") else {},
        }

    async def get_summary(self) -> Dict[str, Any]:
        """Get project summary"""
        summary = self.project.summary()
        return {
            "name": self.project_name,
            "num_sources": len(self.project.sources),
            "num_segments": summary.get("num_segments", 0),
            "num_embeddings": summary.get("num_embeddings", 0),
            "pipelines": await self.list_pipelines(),
        }

    async def quick_embed(self, text: str, embedder: Optional[str] = None) -> List[float]:
        """Quick embed text without creating a full pipeline"""
        return self.project.quick_embed(text, embedder=embedder)
```

### 1.4 Storage Abstraction Layer

```python
# backend/app/core/storage.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pathlib import Path
import json
import aiofiles
import boto3
from app.core.config import settings

class StorageBackend(ABC):
    """Abstract storage backend interface"""

    @abstractmethod
    async def project_exists(self, project_id: str) -> bool:
        """Check if project exists"""
        pass

    @abstractmethod
    async def get_project_path(self, project_id: str) -> str:
        """Get the storage path for a project"""
        pass

    @abstractmethod
    async def save_project_metadata(self, project_id: str, metadata: Dict[str, Any]) -> None:
        """Save project metadata"""
        pass

    @abstractmethod
    async def load_project_metadata(self, project_id: str) -> Dict[str, Any]:
        """Load project metadata"""
        pass

    @abstractmethod
    async def delete_project(self, project_id: str) -> None:
        """Delete a project"""
        pass

    @abstractmethod
    async def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects"""
        pass

class FilesystemStorageBackend(StorageBackend):
    """Local filesystem storage backend"""

    def __init__(self, base_path: str = None):
        self.base_path = Path(base_path or settings.local_storage_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def project_exists(self, project_id: str) -> bool:
        project_dir = self.base_path / project_id
        return project_dir.exists()

    async def get_project_path(self, project_id: str) -> str:
        project_dir = self.base_path / project_id
        project_dir.mkdir(parents=True, exist_ok=True)
        return str(project_dir)

    async def save_project_metadata(self, project_id: str, metadata: Dict[str, Any]) -> None:
        metadata_path = self.base_path / project_id / "metadata.json"
        metadata_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(metadata_path, 'w') as f:
            await f.write(json.dumps(metadata, indent=2))

    async def load_project_metadata(self, project_id: str) -> Dict[str, Any]:
        metadata_path = self.base_path / project_id / "metadata.json"

        if not metadata_path.exists():
            raise FileNotFoundError(f"Project {project_id} not found")

        async with aiofiles.open(metadata_path, 'r') as f:
            content = await f.read()
            return json.loads(content)

    async def delete_project(self, project_id: str) -> None:
        import shutil
        project_dir = self.base_path / project_id
        if project_dir.exists():
            shutil.rmtree(project_dir)

    async def list_projects(self) -> List[Dict[str, Any]]:
        projects = []
        for project_dir in self.base_path.iterdir():
            if project_dir.is_dir():
                try:
                    metadata = await self.load_project_metadata(project_dir.name)
                    metadata["id"] = project_dir.name
                    projects.append(metadata)
                except FileNotFoundError:
                    continue
        return projects

    async def save_source_metadata(self, project_id: str, source_key: str, metadata: Dict[str, Any]) -> None:
        metadata_path = self.base_path / project_id / "sources" / f"{source_key}.meta.json"
        metadata_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(metadata_path, 'w') as f:
            await f.write(json.dumps(metadata, indent=2))

    async def delete_source_metadata(self, project_id: str, source_key: str) -> None:
        metadata_path = self.base_path / project_id / "sources" / f"{source_key}.meta.json"
        if metadata_path.exists():
            metadata_path.unlink()

    async def save_pipeline_metadata(self, project_id: str, pipeline_name: str, config: Dict[str, Any]) -> None:
        metadata_path = self.base_path / project_id / "pipelines" / f"{pipeline_name}.json"
        metadata_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(metadata_path, 'w') as f:
            await f.write(json.dumps(config, indent=2))

    async def load_pipeline_metadata(self, project_id: str, pipeline_name: str) -> Dict[str, Any]:
        metadata_path = self.base_path / project_id / "pipelines" / f"{pipeline_name}.json"

        async with aiofiles.open(metadata_path, 'r') as f:
            content = await f.read()
            return json.loads(content)

class S3StorageBackend(StorageBackend):
    """AWS S3 storage backend for cloud deployment"""

    def __init__(self, bucket_name: str = None):
        self.bucket_name = bucket_name or settings.s3_bucket
        self.s3_client = boto3.client('s3', region_name=settings.s3_region)

    # Implement methods similar to FilesystemStorageBackend
    # but using S3 operations (put_object, get_object, list_objects_v2, etc.)
    pass

def get_storage_backend() -> StorageBackend:
    """Factory function to get the appropriate storage backend"""
    if settings.storage_backend == "filesystem":
        return FilesystemStorageBackend()
    elif settings.storage_backend == "s3":
        return S3StorageBackend()
    elif settings.storage_backend == "gcs":
        # return GCSStorageBackend()
        raise NotImplementedError("GCS backend not yet implemented")
    else:
        raise ValueError(f"Unknown storage backend: {settings.storage_backend}")
```

### 1.5 API Endpoint Example

```python
# backend/app/api/v1/projects.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from datetime import datetime
import uuid

from app.models.api_models import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ProjectSummary
)
from app.services.project_service import ProjectService
from app.core.dependencies import get_project_service

router = APIRouter()

@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    project_data: ProjectCreate,
    service: ProjectService = Depends(get_project_service)
):
    """Create a new project"""
    try:
        project_id = str(uuid.uuid4())
        project = await service.create_project(
            project_id=project_id,
            name=project_data.name,
            backend=project_data.backend,
            description=project_data.description
        )
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    service: ProjectService = Depends(get_project_service)
):
    """List all projects"""
    projects = await service.list_projects(skip=skip, limit=limit)
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    service: ProjectService = Depends(get_project_service)
):
    """Get project details"""
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    service: ProjectService = Depends(get_project_service)
):
    """Update project"""
    project = await service.update_project(project_id, project_data)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    service: ProjectService = Depends(get_project_service)
):
    """Delete project"""
    success = await service.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")

@router.get("/{project_id}/summary", response_model=ProjectSummary)
async def get_project_summary(
    project_id: str,
    service: ProjectService = Depends(get_project_service)
):
    """Get project summary with statistics"""
    summary = await service.get_project_summary(project_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Project not found")
    return summary
```

### 1.6 Background Task Execution

```python
# backend/app/tasks/pipeline_tasks.py
from typing import Dict, Any, Optional, Callable
import asyncio
from datetime import datetime
from app.core.ef_wrapper import EFProjectWrapper
from app.core.storage import get_storage_backend

class PipelineExecutionManager:
    """Manages pipeline execution with progress tracking"""

    def __init__(self):
        self.executions: Dict[str, Dict[str, Any]] = {}
        self.storage = get_storage_backend()

    async def execute_pipeline(
        self,
        execution_id: str,
        project_id: str,
        pipeline_name: str,
        progress_callback: Optional[Callable] = None
    ) -> None:
        """Execute a pipeline asynchronously with progress tracking"""

        # Initialize execution record
        self.executions[execution_id] = {
            "status": "running",
            "progress": 0.0,
            "started_at": datetime.utcnow(),
            "completed_at": None,
            "error": None
        }

        try:
            # Load project
            metadata = await self.storage.load_project_metadata(project_id)
            wrapper = EFProjectWrapper(project_id, metadata["name"], metadata["backend"])
            await wrapper.initialize()

            # Update progress
            await self._update_progress(execution_id, 0.1, "Project loaded")

            # Run pipeline
            await self._update_progress(execution_id, 0.3, "Running pipeline...")
            await wrapper.run_pipeline(pipeline_name)

            # Complete
            await self._update_progress(execution_id, 1.0, "Completed")
            self.executions[execution_id]["status"] = "completed"
            self.executions[execution_id]["completed_at"] = datetime.utcnow()

        except Exception as e:
            self.executions[execution_id]["status"] = "failed"
            self.executions[execution_id]["error"] = str(e)
            self.executions[execution_id]["completed_at"] = datetime.utcnow()

    async def _update_progress(
        self,
        execution_id: str,
        progress: float,
        message: str = ""
    ) -> None:
        """Update execution progress"""
        if execution_id in self.executions:
            self.executions[execution_id]["progress"] = progress
            self.executions[execution_id]["message"] = message

    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get execution status"""
        return self.executions.get(execution_id)

# Global instance
pipeline_manager = PipelineExecutionManager()
```

---

## 2. Frontend Technical Specifications

### 2.1 API Client Setup

```typescript
// frontend/src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2.2 Type Definitions

```typescript
// frontend/src/types/project.ts
export interface Project {
  id: string;
  name: string;
  backend: string;
  description?: string;
  created_at: string;
  updated_at: string;
  source_count: number;
  pipeline_count: number;
}

export interface ProjectCreate {
  name: string;
  backend: 'memory' | 'filesystem' | 'cloud';
  description?: string;
}

export interface Source {
  key: string;
  content: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface Pipeline {
  name: string;
  embedder: string;
  planarizer?: string;
  clusterer?: string;
  num_clusters?: number;
  segmenter: string;
  parameters?: Record<string, any>;
}

export interface PipelineExecution {
  execution_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  started_at: string;
  completed_at?: string;
  error?: string;
  message?: string;
}

export interface EmbeddingResult {
  embeddings: number[][];
  planar_embeddings?: number[][];
  clusters?: number[];
  labels?: string[];
}
```

### 2.3 React Query Hooks

```typescript
// frontend/src/hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/services/projectsApi';
import { Project, ProjectCreate } from '@/types/project';

export const useProjects = () => {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: projectsApi.listProjects,
  });
};

export const useProject = (projectId: string) => {
  return useQuery<Project>({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectCreate) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useProjectSummary = (projectId: string) => {
  return useQuery({
    queryKey: ['projects', projectId, 'summary'],
    queryFn: () => projectsApi.getProjectSummary(projectId),
    enabled: !!projectId,
  });
};
```

### 2.4 WebSocket Hook

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

export const useWebSocket = (url: string, enabled: boolean = true) => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [url, enabled]);

  const sendMessage = (message: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return { messages, isConnected, sendMessage };
};
```

### 2.5 Embedding Visualization Component

```typescript
// frontend/src/components/results/EmbeddingVisualization.tsx
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { EmbeddingResult } from '@/types/project';

interface EmbeddingVisualizationProps {
  data: EmbeddingResult;
  width?: number;
  height?: number;
  onPointClick?: (index: number) => void;
}

export const EmbeddingVisualization: React.FC<EmbeddingVisualizationProps> = ({
  data,
  width = 800,
  height = 600,
  onPointClick,
}) => {
  const plotData = useMemo(() => {
    const embeddings = data.planar_embeddings || data.embeddings;

    // Handle 2D embeddings
    if (embeddings[0]?.length === 2) {
      return [{
        x: embeddings.map(e => e[0]),
        y: embeddings.map(e => e[1]),
        mode: 'markers',
        type: 'scatter',
        text: data.labels,
        marker: {
          size: 8,
          color: data.clusters,
          colorscale: 'Viridis',
          showscale: !!data.clusters,
          colorbar: {
            title: 'Cluster',
          },
        },
        hovertemplate: '<b>%{text}</b><br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>',
      }];
    }

    // Handle 3D embeddings
    if (embeddings[0]?.length === 3) {
      return [{
        x: embeddings.map(e => e[0]),
        y: embeddings.map(e => e[1]),
        z: embeddings.map(e => e[2]),
        mode: 'markers',
        type: 'scatter3d',
        text: data.labels,
        marker: {
          size: 5,
          color: data.clusters,
          colorscale: 'Viridis',
          showscale: !!data.clusters,
        },
      }];
    }

    return [];
  }, [data]);

  const layout = {
    width,
    height,
    title: 'Embedding Visualization',
    hovermode: 'closest',
    showlegend: false,
    xaxis: {
      title: 'Dimension 1',
      zeroline: false,
    },
    yaxis: {
      title: 'Dimension 2',
      zeroline: false,
    },
  };

  const handleClick = (event: any) => {
    if (onPointClick && event.points?.[0]) {
      onPointClick(event.points[0].pointIndex);
    }
  };

  return (
    <div className="embedding-visualization">
      <Plot
        data={plotData}
        layout={layout}
        onClick={handleClick}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        }}
      />
    </div>
  );
};
```

---

## 3. Docker Setup

### 3.1 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3.2 Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3.3 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./backend/app:/app/app  # For development hot-reload
    environment:
      - ENVIRONMENT=local
      - STORAGE_BACKEND=filesystem
      - LOCAL_STORAGE_PATH=/app/data
      - LOG_LEVEL=DEBUG
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/src  # For development hot-reload
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    depends_on:
      - backend

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

---

## 4. Testing Setup

### 4.1 Backend Tests

```python
# backend/tests/test_api/test_projects.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_project():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/projects",
            json={
                "name": "Test Project",
                "backend": "memory",
                "description": "A test project"
            }
        )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert "id" in data

@pytest.mark.asyncio
async def test_list_projects():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/projects")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
```

### 4.2 Frontend Tests

```typescript
// frontend/src/components/projects/ProjectList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectList } from './ProjectList';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/v1/projects', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          name: 'Test Project',
          backend: 'filesystem',
          source_count: 5,
          pipeline_count: 2,
        },
      ])
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('renders project list', async () => {
  const queryClient = new QueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <ProjectList />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
});
```

---

## 5. Deployment Configurations

### 5.1 Kubernetes Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-ef-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app-ef-backend
  template:
    metadata:
      labels:
        app: app-ef-backend
    spec:
      containers:
      - name: backend
        image: app-ef-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: STORAGE_BACKEND
          value: "s3"
        - name: S3_BUCKET
          valueFrom:
            secretKeyRef:
              name: app-ef-secrets
              key: s3-bucket
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-ef-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: app-ef-backend-service
spec:
  selector:
    app: app-ef-backend
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

---

This technical architecture provides concrete implementation details that complement the high-level plan, ensuring a robust, scalable, and maintainable application.
