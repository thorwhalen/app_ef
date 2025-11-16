"""
Components API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, List

from app.models.api_models import ComponentList
from app.core.dependencies import get_project_wrapper
from app.core.ef_wrapper import EFProjectWrapper

router = APIRouter()


@router.get(
    "/{project_id}",
    response_model=ComponentList,
    summary="List all available components",
    description="Get all available embedders, planarizers, clusterers, and segmenters for the project.",
)
async def list_components(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """List all available components."""
    try:
        components = await wrapper.list_available_components()
        return ComponentList(**components)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing components: {str(e)}",
        )


@router.get(
    "/{project_id}/embedders",
    response_model=List[str],
    summary="List available embedders",
    description="Get all available embedder components.",
)
async def list_embedders(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """List available embedders."""
    try:
        components = await wrapper.list_available_components()
        return components["embedders"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing embedders: {str(e)}",
        )


@router.get(
    "/{project_id}/planarizers",
    response_model=List[str],
    summary="List available planarizers",
    description="Get all available planarizer components for dimensionality reduction.",
)
async def list_planarizers(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """List available planarizers."""
    try:
        components = await wrapper.list_available_components()
        return components["planarizers"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing planarizers: {str(e)}",
        )


@router.get(
    "/{project_id}/clusterers",
    response_model=List[str],
    summary="List available clusterers",
    description="Get all available clusterer components.",
)
async def list_clusterers(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """List available clusterers."""
    try:
        components = await wrapper.list_available_components()
        return components["clusterers"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing clusterers: {str(e)}",
        )


@router.get(
    "/{project_id}/segmenters",
    response_model=List[str],
    summary="List available segmenters",
    description="Get all available segmenter components.",
)
async def list_segmenters(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """List available segmenters."""
    try:
        components = await wrapper.list_available_components()
        return components["segmenters"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing segmenters: {str(e)}",
        )
