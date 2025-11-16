"""
Projects API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
import uuid

from app.models.api_models import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSummary,
    MessageResponse,
)
from app.services.project_service import ProjectService
from app.core.dependencies import get_project_service

router = APIRouter()


@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Create a new embedding project with the specified configuration.",
)
async def create_project(
    project_data: ProjectCreate, service: ProjectService = Depends(get_project_service)
):
    """Create a new project."""
    try:
        project_id = str(uuid.uuid4())
        project = await service.create_project(
            project_id=project_id,
            name=project_data.name,
            backend=project_data.backend,
            description=project_data.description,
        )
        return project
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating project: {str(e)}",
        )


@router.get(
    "/",
    response_model=List[ProjectResponse],
    summary="List all projects",
    description="Retrieve a list of all projects with pagination support.",
)
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    service: ProjectService = Depends(get_project_service),
):
    """List all projects."""
    projects = await service.list_projects(skip=skip, limit=limit)
    return projects


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get project details",
    description="Retrieve detailed information about a specific project.",
)
async def get_project(
    project_id: str, service: ProjectService = Depends(get_project_service)
):
    """Get project details."""
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )
    return project


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update project",
    description="Update project metadata (name, description).",
)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    service: ProjectService = Depends(get_project_service),
):
    """Update project."""
    project = await service.update_project(project_id, project_data)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )
    return project


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete project",
    description="Permanently delete a project and all its data.",
)
async def delete_project(
    project_id: str, service: ProjectService = Depends(get_project_service)
):
    """Delete project."""
    success = await service.delete_project(project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )
    return None


@router.get(
    "/{project_id}/summary",
    response_model=ProjectSummary,
    summary="Get project summary",
    description="Get detailed statistics and summary for a project.",
)
async def get_project_summary(
    project_id: str, service: ProjectService = Depends(get_project_service)
):
    """Get project summary with statistics."""
    summary = await service.get_project_summary(project_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )
    return summary
