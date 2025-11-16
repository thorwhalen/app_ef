"""
Pipelines API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from typing import List
import uuid
from datetime import datetime

from app.models.api_models import (
    PipelineCreate,
    PipelineResponse,
    PipelineExecution,
    MessageResponse,
)
from app.core.dependencies import get_project_wrapper
from app.core.ef_wrapper import EFProjectWrapper

router = APIRouter()

# In-memory storage for pipeline executions (in production, use Redis or DB)
_pipeline_executions = {}


@router.post(
    "/{project_id}/pipelines",
    response_model=PipelineResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new pipeline",
    description="Define a new embedding pipeline with specified components.",
)
async def create_pipeline(
    project_id: str,
    pipeline_data: PipelineCreate,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Create a new pipeline."""
    try:
        await wrapper.create_pipeline(
            name=pipeline_data.name,
            embedder=pipeline_data.embedder,
            planarizer=pipeline_data.planarizer,
            clusterer=pipeline_data.clusterer,
            num_clusters=pipeline_data.num_clusters,
            segmenter=pipeline_data.segmenter,
            **(pipeline_data.parameters or {}),
        )

        # Load the created pipeline config
        config = await wrapper.get_pipeline_config(pipeline_data.name)

        return PipelineResponse(
            name=pipeline_data.name,
            embedder=pipeline_data.embedder,
            planarizer=pipeline_data.planarizer,
            clusterer=pipeline_data.clusterer,
            num_clusters=pipeline_data.num_clusters,
            segmenter=pipeline_data.segmenter,
            parameters=pipeline_data.parameters,
            created_at=config.get("created_at"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating pipeline: {str(e)}",
        )


@router.get(
    "/{project_id}/pipelines",
    response_model=List[str],
    summary="List all pipelines",
    description="Get a list of all pipeline names in the project.",
)
async def list_pipelines(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """List all pipelines."""
    try:
        pipelines = await wrapper.list_pipelines()
        return pipelines
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing pipelines: {str(e)}",
        )


@router.get(
    "/{project_id}/pipelines/{pipeline_name}",
    response_model=PipelineResponse,
    summary="Get pipeline configuration",
    description="Retrieve the configuration of a specific pipeline.",
)
async def get_pipeline(
    project_id: str,
    pipeline_name: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Get pipeline configuration."""
    try:
        config = await wrapper.get_pipeline_config(pipeline_name)

        return PipelineResponse(
            name=pipeline_name,
            embedder=config.get("embedder"),
            planarizer=config.get("planarizer"),
            clusterer=config.get("clusterer"),
            num_clusters=config.get("num_clusters"),
            segmenter=config.get("segmenter", "identity"),
            parameters=config.get("parameters"),
            created_at=config.get("created_at"),
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline '{pipeline_name}' not found",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting pipeline: {str(e)}",
        )


@router.delete(
    "/{project_id}/pipelines/{pipeline_name}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a pipeline",
    description="Remove a pipeline from the project.",
)
async def delete_pipeline(
    project_id: str,
    pipeline_name: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Delete a pipeline."""
    try:
        await wrapper.delete_pipeline(pipeline_name)
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting pipeline: {str(e)}",
        )


@router.post(
    "/{project_id}/pipelines/{pipeline_name}/execute",
    response_model=PipelineExecution,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Execute a pipeline",
    description="Run a pipeline and return execution tracking information.",
)
async def execute_pipeline(
    project_id: str,
    pipeline_name: str,
    background_tasks: BackgroundTasks,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Execute a pipeline."""
    try:
        # Verify pipeline exists
        pipelines = await wrapper.list_pipelines()
        if pipeline_name not in pipelines:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pipeline '{pipeline_name}' not found",
            )

        # Create execution record
        execution_id = str(uuid.uuid4())
        execution = {
            "execution_id": execution_id,
            "pipeline_name": pipeline_name,
            "status": "running",
            "progress": 0.0,
            "message": "Starting pipeline execution...",
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "error": None,
        }
        _pipeline_executions[execution_id] = execution

        # Execute pipeline in background
        async def run_pipeline():
            try:
                # Update progress callback
                async def progress_callback(progress: float, message: str):
                    _pipeline_executions[execution_id]["progress"] = progress
                    _pipeline_executions[execution_id]["message"] = message

                # Run the pipeline
                await wrapper.run_pipeline(pipeline_name, progress_callback)

                # Mark as completed
                _pipeline_executions[execution_id]["status"] = "completed"
                _pipeline_executions[execution_id]["progress"] = 1.0
                _pipeline_executions[execution_id]["message"] = "Pipeline completed successfully"
                _pipeline_executions[execution_id]["completed_at"] = (
                    datetime.utcnow().isoformat()
                )
            except Exception as e:
                _pipeline_executions[execution_id]["status"] = "failed"
                _pipeline_executions[execution_id]["error"] = str(e)
                _pipeline_executions[execution_id]["completed_at"] = (
                    datetime.utcnow().isoformat()
                )

        # Add to background tasks
        background_tasks.add_task(run_pipeline)

        return PipelineExecution(**execution)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing pipeline: {str(e)}",
        )


@router.get(
    "/{project_id}/pipelines/{pipeline_name}/executions/{execution_id}",
    response_model=PipelineExecution,
    summary="Get pipeline execution status",
    description="Check the status of a running or completed pipeline execution.",
)
async def get_execution_status(
    project_id: str,
    pipeline_name: str,
    execution_id: str,
):
    """Get pipeline execution status."""
    if execution_id not in _pipeline_executions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution '{execution_id}' not found",
        )

    return PipelineExecution(**_pipeline_executions[execution_id])
