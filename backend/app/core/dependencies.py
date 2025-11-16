"""
Dependency injection for FastAPI endpoints.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status

from app.services.project_service import ProjectService
from app.core.ef_wrapper import EFProjectWrapper


# Global service instances
_project_service: Optional[ProjectService] = None


def get_project_service() -> ProjectService:
    """Get the project service instance."""
    global _project_service
    if _project_service is None:
        _project_service = ProjectService()
    return _project_service


async def get_project_wrapper(
    project_id: str, service: ProjectService = Depends(get_project_service)
) -> EFProjectWrapper:
    """Get a project wrapper for the given project ID."""
    try:
        wrapper = await service._get_wrapper(project_id)
        return wrapper
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading project: {str(e)}",
        )
