"""
Storage abstraction layer for app_ef.
Supports multiple backends: filesystem (local), S3 (cloud), GCS (cloud).
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pathlib import Path
import json
import shutil
import aiofiles
from datetime import datetime

from app.core.config import settings


class StorageBackend(ABC):
    """Abstract storage backend interface."""

    @abstractmethod
    async def project_exists(self, project_id: str) -> bool:
        """Check if project exists."""
        pass

    @abstractmethod
    async def get_project_path(self, project_id: str) -> str:
        """Get the storage path for a project."""
        pass

    @abstractmethod
    async def save_project_metadata(
        self, project_id: str, metadata: Dict[str, Any]
    ) -> None:
        """Save project metadata."""
        pass

    @abstractmethod
    async def load_project_metadata(self, project_id: str) -> Dict[str, Any]:
        """Load project metadata."""
        pass

    @abstractmethod
    async def update_project_metadata(
        self, project_id: str, updates: Dict[str, Any]
    ) -> None:
        """Update project metadata."""
        pass

    @abstractmethod
    async def delete_project(self, project_id: str) -> None:
        """Delete a project and all its data."""
        pass

    @abstractmethod
    async def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects."""
        pass

    @abstractmethod
    async def save_source_metadata(
        self, project_id: str, source_key: str, metadata: Dict[str, Any]
    ) -> None:
        """Save source metadata."""
        pass

    @abstractmethod
    async def load_source_metadata(
        self, project_id: str, source_key: str
    ) -> Dict[str, Any]:
        """Load source metadata."""
        pass

    @abstractmethod
    async def delete_source_metadata(self, project_id: str, source_key: str) -> None:
        """Delete source metadata."""
        pass

    @abstractmethod
    async def save_pipeline_metadata(
        self, project_id: str, pipeline_name: str, config: Dict[str, Any]
    ) -> None:
        """Save pipeline metadata."""
        pass

    @abstractmethod
    async def load_pipeline_metadata(
        self, project_id: str, pipeline_name: str
    ) -> Dict[str, Any]:
        """Load pipeline metadata."""
        pass

    @abstractmethod
    async def delete_pipeline_metadata(
        self, project_id: str, pipeline_name: str
    ) -> None:
        """Delete pipeline metadata."""
        pass

    @abstractmethod
    async def list_pipelines(self, project_id: str) -> List[str]:
        """List all pipeline names for a project."""
        pass


class FilesystemStorageBackend(StorageBackend):
    """Local filesystem storage backend."""

    def __init__(self, base_path: Optional[str] = None):
        self.base_path = Path(base_path or settings.local_storage_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def project_exists(self, project_id: str) -> bool:
        """Check if project exists."""
        project_dir = self.base_path / project_id
        return project_dir.exists()

    async def get_project_path(self, project_id: str) -> str:
        """Get the storage path for a project."""
        project_dir = self.base_path / project_id
        project_dir.mkdir(parents=True, exist_ok=True)
        return str(project_dir)

    async def save_project_metadata(
        self, project_id: str, metadata: Dict[str, Any]
    ) -> None:
        """Save project metadata."""
        metadata_path = self.base_path / project_id / "metadata.json"
        metadata_path.parent.mkdir(parents=True, exist_ok=True)

        # Add timestamps
        if "created_at" not in metadata:
            metadata["created_at"] = datetime.utcnow().isoformat()
        metadata["updated_at"] = datetime.utcnow().isoformat()

        async with aiofiles.open(metadata_path, "w") as f:
            await f.write(json.dumps(metadata, indent=2))

    async def load_project_metadata(self, project_id: str) -> Dict[str, Any]:
        """Load project metadata."""
        metadata_path = self.base_path / project_id / "metadata.json"

        if not metadata_path.exists():
            raise FileNotFoundError(f"Project {project_id} not found")

        async with aiofiles.open(metadata_path, "r") as f:
            content = await f.read()
            return json.loads(content)

    async def update_project_metadata(
        self, project_id: str, updates: Dict[str, Any]
    ) -> None:
        """Update project metadata."""
        metadata = await self.load_project_metadata(project_id)
        metadata.update(updates)
        await self.save_project_metadata(project_id, metadata)

    async def delete_project(self, project_id: str) -> None:
        """Delete a project and all its data."""
        project_dir = self.base_path / project_id
        if project_dir.exists():
            shutil.rmtree(project_dir)

    async def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects."""
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

    async def save_source_metadata(
        self, project_id: str, source_key: str, metadata: Dict[str, Any]
    ) -> None:
        """Save source metadata."""
        # Sanitize source_key for filesystem
        safe_key = source_key.replace("/", "_").replace("\\", "_")
        metadata_path = (
            self.base_path / project_id / "sources" / f"{safe_key}.meta.json"
        )
        metadata_path.parent.mkdir(parents=True, exist_ok=True)

        metadata["created_at"] = datetime.utcnow().isoformat()

        async with aiofiles.open(metadata_path, "w") as f:
            await f.write(json.dumps(metadata, indent=2))

    async def load_source_metadata(
        self, project_id: str, source_key: str
    ) -> Dict[str, Any]:
        """Load source metadata."""
        safe_key = source_key.replace("/", "_").replace("\\", "_")
        metadata_path = (
            self.base_path / project_id / "sources" / f"{safe_key}.meta.json"
        )

        if not metadata_path.exists():
            return {}

        async with aiofiles.open(metadata_path, "r") as f:
            content = await f.read()
            return json.loads(content)

    async def delete_source_metadata(self, project_id: str, source_key: str) -> None:
        """Delete source metadata."""
        safe_key = source_key.replace("/", "_").replace("\\", "_")
        metadata_path = (
            self.base_path / project_id / "sources" / f"{safe_key}.meta.json"
        )
        if metadata_path.exists():
            metadata_path.unlink()

    async def save_pipeline_metadata(
        self, project_id: str, pipeline_name: str, config: Dict[str, Any]
    ) -> None:
        """Save pipeline metadata."""
        metadata_path = (
            self.base_path / project_id / "pipelines" / f"{pipeline_name}.json"
        )
        metadata_path.parent.mkdir(parents=True, exist_ok=True)

        config["created_at"] = datetime.utcnow().isoformat()

        async with aiofiles.open(metadata_path, "w") as f:
            await f.write(json.dumps(config, indent=2))

    async def load_pipeline_metadata(
        self, project_id: str, pipeline_name: str
    ) -> Dict[str, Any]:
        """Load pipeline metadata."""
        metadata_path = (
            self.base_path / project_id / "pipelines" / f"{pipeline_name}.json"
        )

        if not metadata_path.exists():
            raise FileNotFoundError(
                f"Pipeline {pipeline_name} not found in project {project_id}"
            )

        async with aiofiles.open(metadata_path, "r") as f:
            content = await f.read()
            return json.loads(content)

    async def delete_pipeline_metadata(
        self, project_id: str, pipeline_name: str
    ) -> None:
        """Delete pipeline metadata."""
        metadata_path = (
            self.base_path / project_id / "pipelines" / f"{pipeline_name}.json"
        )
        if metadata_path.exists():
            metadata_path.unlink()

    async def list_pipelines(self, project_id: str) -> List[str]:
        """List all pipeline names for a project."""
        pipelines_dir = self.base_path / project_id / "pipelines"
        if not pipelines_dir.exists():
            return []

        pipelines = []
        for pipeline_file in pipelines_dir.glob("*.json"):
            pipelines.append(pipeline_file.stem)
        return pipelines


class S3StorageBackend(StorageBackend):
    """AWS S3 storage backend for cloud deployment."""

    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket_name = bucket_name or settings.s3_bucket
        if not self.bucket_name:
            raise ValueError("S3 bucket name must be provided")
        # TODO: Initialize S3 client
        # self.s3_client = boto3.client('s3', region_name=settings.s3_region)

    # TODO: Implement all abstract methods using S3 operations
    async def project_exists(self, project_id: str) -> bool:
        raise NotImplementedError("S3 backend not yet implemented")

    async def get_project_path(self, project_id: str) -> str:
        raise NotImplementedError("S3 backend not yet implemented")

    async def save_project_metadata(
        self, project_id: str, metadata: Dict[str, Any]
    ) -> None:
        raise NotImplementedError("S3 backend not yet implemented")

    async def load_project_metadata(self, project_id: str) -> Dict[str, Any]:
        raise NotImplementedError("S3 backend not yet implemented")

    async def update_project_metadata(
        self, project_id: str, updates: Dict[str, Any]
    ) -> None:
        raise NotImplementedError("S3 backend not yet implemented")

    async def delete_project(self, project_id: str) -> None:
        raise NotImplementedError("S3 backend not yet implemented")

    async def list_projects(self) -> List[Dict[str, Any]]:
        raise NotImplementedError("S3 backend not yet implemented")

    async def save_source_metadata(
        self, project_id: str, source_key: str, metadata: Dict[str, Any]
    ) -> None:
        raise NotImplementedError("S3 backend not yet implemented")

    async def load_source_metadata(
        self, project_id: str, source_key: str
    ) -> Dict[str, Any]:
        raise NotImplementedError("S3 backend not yet implemented")

    async def delete_source_metadata(self, project_id: str, source_key: str) -> None:
        raise NotImplementedError("S3 backend not yet implemented")

    async def save_pipeline_metadata(
        self, project_id: str, pipeline_name: str, config: Dict[str, Any]
    ) -> None:
        raise NotImplementedError("S3 backend not yet implemented")

    async def load_pipeline_metadata(
        self, project_id: str, pipeline_name: str
    ) -> Dict[str, Any]:
        raise NotImplementedError("S3 backend not yet implemented")

    async def delete_pipeline_metadata(
        self, project_id: str, pipeline_name: str
    ) -> None:
        raise NotImplementedError("S3 backend not yet implemented")

    async def list_pipelines(self, project_id: str) -> List[str]:
        raise NotImplementedError("S3 backend not yet implemented")


def get_storage_backend() -> StorageBackend:
    """Factory function to get the appropriate storage backend."""
    if settings.storage_backend == "filesystem":
        return FilesystemStorageBackend()
    elif settings.storage_backend == "s3":
        return S3StorageBackend()
    elif settings.storage_backend == "gcs":
        raise NotImplementedError("GCS backend not yet implemented")
    else:
        raise ValueError(f"Unknown storage backend: {settings.storage_backend}")
