"""
Wrapper around the ef library for API usage.
Provides enhanced functionality and async-friendly interface.
"""
from typing import Dict, List, Any, Optional
from pathlib import Path
import asyncio
from functools import wraps

# TODO: Uncomment when ef is installed
# import ef

from app.core.storage import get_storage_backend, StorageBackend


def async_wrap(func):
    """Wrapper to make synchronous ef calls async-friendly."""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

    return wrapper


class EFProjectWrapper:
    """
    Wrapper around ef.Project with enhanced functionality for API usage.

    This class provides an async-friendly interface to ef projects,
    with additional metadata tracking and error handling.
    """

    def __init__(
        self,
        project_id: str,
        project_name: str,
        backend: str = "filesystem",
        storage: Optional[StorageBackend] = None,
    ):
        self.project_id = project_id
        self.project_name = project_name
        self.backend_type = backend
        self.storage = storage or get_storage_backend()
        self._project = None  # Will hold ef.Project instance
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize or load the ef project."""
        if self._initialized:
            return

        project_path = await self.storage.get_project_path(self.project_id)

        # TODO: Replace mock with actual ef.Project
        # if await self.storage.project_exists(self.project_id):
        #     # Load existing project
        #     self._project = await async_wrap(ef.Project.load)(project_path)
        # else:
        #     # Create new project
        #     self._project = await async_wrap(ef.Project.create)(
        #         self.project_name,
        #         backend=self.backend_type,
        #         root_dir=project_path
        #     )
        #     await self.storage.save_project_metadata(
        #         self.project_id,
        #         {
        #             "name": self.project_name,
        #             "backend": self.backend_type,
        #             "project_path": project_path
        #         }
        #     )

        # Mock implementation until ef is available
        self._project = MockEFProject(self.project_name, project_path)

        if not await self.storage.project_exists(self.project_id):
            await self.storage.save_project_metadata(
                self.project_id,
                {
                    "name": self.project_name,
                    "backend": self.backend_type,
                    "project_path": project_path,
                },
            )

        self._initialized = True

    @property
    def project(self):
        """Get the underlying ef.Project instance."""
        if not self._initialized:
            raise RuntimeError(
                "Project not initialized. Call initialize() first."
            )
        return self._project

    async def add_source(
        self, key: str, content: str, metadata: Optional[Dict] = None
    ) -> None:
        """Add a source document to the project."""
        # TODO: Replace with actual ef call
        # await async_wrap(self.project.add_source)(key, content)
        self.project.add_source(key, content)

        if metadata:
            await self.storage.save_source_metadata(self.project_id, key, metadata)

    async def list_sources(self) -> List[str]:
        """List all source keys."""
        # TODO: Replace with actual ef call
        # return list(self.project.sources.keys())
        return list(self.project.sources.keys())

    async def get_source(self, key: str) -> str:
        """Get source content by key."""
        # TODO: Replace with actual ef call
        # return self.project.sources[key]
        return self.project.sources.get(key, "")

    async def remove_source(self, key: str) -> None:
        """Remove a source from the project."""
        # TODO: Replace with actual ef call
        # del self.project.sources[key]
        if key in self.project.sources:
            del self.project.sources[key]
        await self.storage.delete_source_metadata(self.project_id, key)

    async def list_available_components(self) -> Dict[str, List[str]]:
        """List all available components."""
        # TODO: Replace with actual ef call
        # components = self.project.list_components()
        # return {
        #     "embedders": list(components.get("embedders", {}).keys()),
        #     "planarizers": list(components.get("planarizers", {}).keys()),
        #     "clusterers": list(components.get("clusterers", {}).keys()),
        #     "segmenters": list(components.get("segmenters", {}).keys()),
        # }

        # Mock implementation
        return {
            "embedders": ["simple", "char_counts"],
            "planarizers": ["simple_2d", "normalize_2d"],
            "clusterers": ["simple_kmeans", "threshold"],
            "segmenters": ["identity", "lines", "sentences"],
        }

    async def create_pipeline(
        self,
        name: str,
        embedder: str,
        planarizer: Optional[str] = None,
        clusterer: Optional[str] = None,
        num_clusters: Optional[int] = None,
        segmenter: str = "identity",
        **kwargs,
    ) -> None:
        """Create a new pipeline."""
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

        # TODO: Replace with actual ef call
        # await async_wrap(self.project.create_pipeline)(name, **pipeline_config)
        self.project.create_pipeline(name, **pipeline_config)

        # Save pipeline metadata
        await self.storage.save_pipeline_metadata(
            self.project_id, name, pipeline_config
        )

    async def list_pipelines(self) -> List[str]:
        """List all pipeline names."""
        # TODO: Replace with actual ef call
        # return list(self.project.list_pipelines())
        return await self.storage.list_pipelines(self.project_id)

    async def get_pipeline_config(self, name: str) -> Dict[str, Any]:
        """Get pipeline configuration."""
        return await self.storage.load_pipeline_metadata(self.project_id, name)

    async def delete_pipeline(self, name: str) -> None:
        """Delete a pipeline."""
        # TODO: Replace with actual ef call if ef supports deletion
        await self.storage.delete_pipeline_metadata(self.project_id, name)

    async def run_pipeline(
        self, name: str, progress_callback: Optional[callable] = None
    ) -> None:
        """Execute a pipeline."""
        # TODO: Replace with actual ef call
        # await async_wrap(self.project.run_pipeline)(name)

        # Mock implementation
        if progress_callback:
            await progress_callback(0.0, "Starting pipeline")
            await asyncio.sleep(0.1)
            await progress_callback(0.5, "Processing embeddings")
            await asyncio.sleep(0.1)
            await progress_callback(1.0, "Pipeline complete")

        self.project.run_pipeline(name)

    async def get_results(self) -> Dict[str, Any]:
        """Get all results from the project."""
        # TODO: Replace with actual ef calls
        # return {
        #     "segments": dict(self.project.segments),
        #     "embeddings": dict(self.project.embeddings),
        #     "planar_embeddings": dict(self.project.planar_embeddings)
        #                           if hasattr(self.project, "planar_embeddings") else {},
        #     "clusters": dict(self.project.clusters)
        #                if hasattr(self.project, "clusters") else {},
        # }

        # Mock implementation
        return {
            "segments": self.project.segments,
            "embeddings": self.project.embeddings,
            "planar_embeddings": self.project.planar_embeddings,
            "clusters": self.project.clusters,
        }

    async def get_segments(self) -> Dict[str, str]:
        """Get all segments."""
        return self.project.segments

    async def get_embeddings(self) -> Dict[str, List[float]]:
        """Get all embeddings."""
        return self.project.embeddings

    async def get_planar_embeddings(self) -> Dict[str, List[float]]:
        """Get planar (2D/3D) embeddings."""
        return self.project.planar_embeddings

    async def get_clusters(self) -> Dict[str, int]:
        """Get cluster assignments."""
        return self.project.clusters

    async def get_summary(self) -> Dict[str, Any]:
        """Get project summary with statistics."""
        # TODO: Replace with actual ef call
        # summary = self.project.summary()

        pipelines = await self.list_pipelines()

        return {
            "name": self.project_name,
            "num_sources": len(self.project.sources),
            "num_segments": len(self.project.segments),
            "num_embeddings": len(self.project.embeddings),
            "num_pipelines": len(pipelines),
            "pipelines": pipelines,
        }

    async def quick_embed(
        self, text: str, embedder: Optional[str] = None
    ) -> List[float]:
        """Quick embed text without creating a full pipeline."""
        # TODO: Replace with actual ef call
        # return await async_wrap(self.project.quick_embed)(text, embedder=embedder)

        # Mock implementation
        return [0.1, 0.2, 0.3, 0.4, 0.5]


class MockEFProject:
    """
    Mock ef.Project for development when ef library is not available.
    This should be replaced with actual ef.Project once installed.
    """

    def __init__(self, name: str, path: str):
        self.name = name
        self.path = path
        self.sources: Dict[str, str] = {}
        self.segments: Dict[str, str] = {}
        self.embeddings: Dict[str, List[float]] = {}
        self.planar_embeddings: Dict[str, List[float]] = {}
        self.clusters: Dict[str, int] = {}
        self.pipelines: Dict[str, Dict[str, Any]] = {}

    def add_source(self, key: str, content: str) -> None:
        """Add a source document."""
        self.sources[key] = content

    def create_pipeline(self, name: str, **config) -> None:
        """Create a pipeline."""
        self.pipelines[name] = config

    def run_pipeline(self, name: str) -> None:
        """Run a pipeline (mock)."""
        # Mock: Just create some fake embeddings
        for i, (key, content) in enumerate(self.sources.items()):
            self.segments[key] = content
            self.embeddings[key] = [float(i), float(i + 1), float(i + 2)]
            self.planar_embeddings[key] = [float(i), float(i + 1)]
            self.clusters[key] = i % 3

    def list_pipelines(self) -> List[str]:
        """List pipeline names."""
        return list(self.pipelines.keys())

    def summary(self) -> Dict[str, Any]:
        """Get summary."""
        return {
            "num_sources": len(self.sources),
            "num_segments": len(self.segments),
            "num_embeddings": len(self.embeddings),
        }
