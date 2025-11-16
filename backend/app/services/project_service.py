"""
Project service layer - Business logic for project management.
"""
from typing import List, Optional
import uuid

from app.core.ef_wrapper import EFProjectWrapper
from app.core.storage import get_storage_backend
from app.models.api_models import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSummary,
)


class ProjectService:
    """Service for managing projects."""

    def __init__(self):
        self.storage = get_storage_backend()
        self._project_wrappers = {}  # Cache for active project wrappers

    async def create_project(
        self, project_id: str, name: str, backend: str, description: Optional[str] = None
    ) -> ProjectResponse:
        """Create a new project."""
        # Create EF wrapper
        wrapper = EFProjectWrapper(project_id, name, backend, self.storage)
        await wrapper.initialize()

        # Cache the wrapper
        self._project_wrappers[project_id] = wrapper

        # Load metadata
        metadata = await self.storage.load_project_metadata(project_id)

        return ProjectResponse(
            id=project_id,
            name=metadata["name"],
            backend=metadata["backend"],
            description=description,
            created_at=metadata["created_at"],
            updated_at=metadata["updated_at"],
            source_count=0,
            pipeline_count=0,
        )

    async def get_project(self, project_id: str) -> Optional[ProjectResponse]:
        """Get a project by ID."""
        try:
            metadata = await self.storage.load_project_metadata(project_id)

            # Get wrapper to count sources and pipelines
            wrapper = await self._get_wrapper(project_id)
            sources = await wrapper.list_sources()
            pipelines = await wrapper.list_pipelines()

            return ProjectResponse(
                id=project_id,
                name=metadata["name"],
                backend=metadata["backend"],
                description=metadata.get("description"),
                created_at=metadata["created_at"],
                updated_at=metadata["updated_at"],
                source_count=len(sources),
                pipeline_count=len(pipelines),
            )
        except FileNotFoundError:
            return None

    async def list_projects(
        self, skip: int = 0, limit: int = 100
    ) -> List[ProjectResponse]:
        """List all projects with pagination."""
        projects_metadata = await self.storage.list_projects()

        # Apply pagination
        paginated = projects_metadata[skip : skip + limit]

        results = []
        for metadata in paginated:
            project_id = metadata["id"]
            try:
                wrapper = await self._get_wrapper(project_id)
                sources = await wrapper.list_sources()
                pipelines = await wrapper.list_pipelines()

                results.append(
                    ProjectResponse(
                        id=project_id,
                        name=metadata["name"],
                        backend=metadata["backend"],
                        description=metadata.get("description"),
                        created_at=metadata["created_at"],
                        updated_at=metadata["updated_at"],
                        source_count=len(sources),
                        pipeline_count=len(pipelines),
                    )
                )
            except Exception as e:
                # Skip projects that can't be loaded
                print(f"Warning: Could not load project {project_id}: {e}")
                continue

        return results

    async def update_project(
        self, project_id: str, update_data: ProjectUpdate
    ) -> Optional[ProjectResponse]:
        """Update a project."""
        try:
            metadata = await self.storage.load_project_metadata(project_id)

            # Apply updates
            if update_data.name is not None:
                metadata["name"] = update_data.name
            if update_data.description is not None:
                metadata["description"] = update_data.description

            await self.storage.update_project_metadata(project_id, metadata)

            # Reload and return
            return await self.get_project(project_id)
        except FileNotFoundError:
            return None

    async def delete_project(self, project_id: str) -> bool:
        """Delete a project."""
        try:
            await self.storage.delete_project(project_id)

            # Remove from cache
            if project_id in self._project_wrappers:
                del self._project_wrappers[project_id]

            return True
        except FileNotFoundError:
            return False

    async def get_project_summary(self, project_id: str) -> Optional[ProjectSummary]:
        """Get detailed project summary."""
        try:
            wrapper = await self._get_wrapper(project_id)
            summary = await wrapper.get_summary()

            return ProjectSummary(
                id=project_id,
                name=summary["name"],
                backend="filesystem",  # TODO: Get from metadata
                num_sources=summary["num_sources"],
                num_segments=summary["num_segments"],
                num_embeddings=summary["num_embeddings"],
                num_pipelines=summary["num_pipelines"],
                pipelines=summary["pipelines"],
            )
        except FileNotFoundError:
            return None

    async def _get_wrapper(self, project_id: str) -> EFProjectWrapper:
        """Get or create a project wrapper."""
        if project_id in self._project_wrappers:
            return self._project_wrappers[project_id]

        # Load metadata
        metadata = await self.storage.load_project_metadata(project_id)

        # Create wrapper
        wrapper = EFProjectWrapper(
            project_id, metadata["name"], metadata["backend"], self.storage
        )
        await wrapper.initialize()

        # Cache it
        self._project_wrappers[project_id] = wrapper

        return wrapper

    def get_wrapper(self, project_id: str) -> Optional[EFProjectWrapper]:
        """Get cached wrapper synchronously (for dependency injection)."""
        return self._project_wrappers.get(project_id)
