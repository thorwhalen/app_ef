"""
Results API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, List, Any

from app.models.api_models import VisualizationData
from app.core.dependencies import get_project_wrapper
from app.core.ef_wrapper import EFProjectWrapper

router = APIRouter()


@router.get(
    "/{project_id}/results/segments",
    response_model=Dict[str, str],
    summary="Get all segments",
    description="Retrieve all text segments from the project.",
)
async def get_segments(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Get all segments."""
    try:
        segments = await wrapper.get_segments()
        return segments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting segments: {str(e)}",
        )


@router.get(
    "/{project_id}/results/embeddings",
    response_model=Dict[str, List[float]],
    summary="Get all embeddings",
    description="Retrieve all embeddings from the project.",
)
async def get_embeddings(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Get all embeddings."""
    try:
        embeddings = await wrapper.get_embeddings()
        return embeddings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting embeddings: {str(e)}",
        )


@router.get(
    "/{project_id}/results/planar",
    response_model=Dict[str, List[float]],
    summary="Get planar embeddings",
    description="Retrieve 2D/3D planar embeddings for visualization.",
)
async def get_planar_embeddings(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Get planar embeddings."""
    try:
        planar = await wrapper.get_planar_embeddings()
        return planar
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting planar embeddings: {str(e)}",
        )


@router.get(
    "/{project_id}/results/clusters",
    response_model=Dict[str, int],
    summary="Get cluster assignments",
    description="Retrieve cluster assignments for all segments.",
)
async def get_clusters(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Get cluster assignments."""
    try:
        clusters = await wrapper.get_clusters()
        return clusters
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting clusters: {str(e)}",
        )


@router.get(
    "/{project_id}/results",
    response_model=Dict[str, Any],
    summary="Get all results",
    description="Retrieve all results (segments, embeddings, planar, clusters) from the project.",
)
async def get_all_results(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Get all results."""
    try:
        results = await wrapper.get_results()
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting results: {str(e)}",
        )


@router.get(
    "/{project_id}/results/visualization",
    response_model=VisualizationData,
    summary="Get visualization data",
    description="Get optimized data structure for visualization with 2D/3D coordinates, clusters, and labels.",
)
async def get_visualization_data(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Get visualization data."""
    try:
        # Get planar embeddings and clusters
        planar = await wrapper.get_planar_embeddings()
        clusters = await wrapper.get_clusters()

        # Convert to visualization format
        embeddings_list = []
        clusters_list = []
        labels_list = []

        for key in planar.keys():
            embeddings_list.append(planar[key])
            labels_list.append(key)
            if key in clusters:
                clusters_list.append(clusters[key])

        # Calculate metadata
        num_clusters = len(set(clusters_list)) if clusters_list else 0

        return VisualizationData(
            embeddings=embeddings_list,
            clusters=clusters_list if clusters_list else None,
            labels=labels_list,
            metadata={
                "num_points": len(embeddings_list),
                "num_clusters": num_clusters,
                "dimensions": len(embeddings_list[0]) if embeddings_list else 0,
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting visualization data: {str(e)}",
        )
