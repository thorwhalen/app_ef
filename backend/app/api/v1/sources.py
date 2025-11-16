"""
Sources API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from typing import List

from app.models.api_models import (
    SourceCreate,
    SourceResponse,
    BulkSourcesCreate,
    MessageResponse,
)
from app.core.dependencies import get_project_wrapper
from app.core.ef_wrapper import EFProjectWrapper

router = APIRouter()


@router.post(
    "/{project_id}/sources",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a source to a project",
    description="Add a new source document to the project.",
)
async def add_source(
    project_id: str,
    source_data: SourceCreate,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Add a source to the project."""
    try:
        await wrapper.add_source(
            source_data.key, source_data.content, source_data.metadata
        )

        return SourceResponse(
            key=source_data.key,
            content=source_data.content,
            metadata=source_data.metadata,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding source: {str(e)}",
        )


@router.post(
    "/{project_id}/sources/bulk",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add multiple sources at once",
    description="Bulk upload sources to the project.",
)
async def add_sources_bulk(
    project_id: str,
    bulk_data: BulkSourcesCreate,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Add multiple sources to the project."""
    try:
        added_count = 0
        for source in bulk_data.sources:
            await wrapper.add_source(source.key, source.content, source.metadata)
            added_count += 1

        return MessageResponse(
            message=f"Successfully added {added_count} sources",
            detail={"count": added_count},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding sources: {str(e)}",
        )


@router.get(
    "/{project_id}/sources",
    response_model=List[str],
    summary="List all source keys",
    description="Retrieve a list of all source keys in the project.",
)
async def list_sources(
    project_id: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """List all source keys."""
    try:
        sources = await wrapper.list_sources()
        return sources
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing sources: {str(e)}",
        )


@router.get(
    "/{project_id}/sources/{source_key}",
    response_model=SourceResponse,
    summary="Get a source by key",
    description="Retrieve a specific source document by its key.",
)
async def get_source(
    project_id: str,
    source_key: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Get a source by key."""
    try:
        content = await wrapper.get_source(source_key)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source '{source_key}' not found",
            )

        # Load metadata if available
        metadata = await wrapper.storage.load_source_metadata(
            wrapper.project_id, source_key
        )

        return SourceResponse(
            key=source_key,
            content=content,
            metadata=metadata if metadata else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting source: {str(e)}",
        )


@router.delete(
    "/{project_id}/sources/{source_key}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a source",
    description="Remove a source document from the project.",
)
async def delete_source(
    project_id: str,
    source_key: str,
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Delete a source."""
    try:
        await wrapper.remove_source(source_key)
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting source: {str(e)}",
        )


@router.post(
    "/{project_id}/sources/upload",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file as a source",
    description="Upload a text file to be added as a source document.",
)
async def upload_source_file(
    project_id: str,
    file: UploadFile = File(...),
    wrapper: EFProjectWrapper = Depends(get_project_wrapper),
):
    """Upload a file as a source."""
    try:
        # Read file content
        content = await file.read()
        text_content = content.decode("utf-8")

        # Use filename as key
        key = file.filename or "uploaded_file"

        # Add source
        await wrapper.add_source(
            key,
            text_content,
            metadata={
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(content),
            },
        )

        return SourceResponse(
            key=key,
            content=text_content,
            metadata={
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(content),
            },
        )
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a text file (UTF-8 encoded)",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}",
        )
