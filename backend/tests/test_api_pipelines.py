"""
Tests for Pipelines API endpoints.
"""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_create_pipeline():
    """Test creating a pipeline."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # Create pipeline
        pipeline_response = await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={
                "name": "test_pipeline",
                "embedder": "simple",
                "planarizer": "simple_2d",
                "clusterer": "simple_kmeans",
                "num_clusters": 3,
                "segmenter": "identity",
            },
        )

    assert pipeline_response.status_code == 201
    data = pipeline_response.json()
    assert data["name"] == "test_pipeline"
    assert data["embedder"] == "simple"
    assert data["planarizer"] == "simple_2d"


@pytest.mark.asyncio
async def test_list_pipelines():
    """Test listing pipelines."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # Create pipelines
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={"name": "pipeline_1", "embedder": "simple", "segmenter": "identity"},
        )
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={"name": "pipeline_2", "embedder": "char_counts", "segmenter": "lines"},
        )

        # List pipelines
        list_response = await client.get(f"/api/v1/{project_id}/pipelines")

    assert list_response.status_code == 200
    data = list_response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert "pipeline_1" in data
    assert "pipeline_2" in data


@pytest.mark.asyncio
async def test_get_pipeline():
    """Test getting a pipeline."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # Create pipeline
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={"name": "test_pipeline", "embedder": "simple", "segmenter": "identity"},
        )

        # Get pipeline
        get_response = await client.get(
            f"/api/v1/{project_id}/pipelines/test_pipeline"
        )

    assert get_response.status_code == 200
    data = get_response.json()
    assert data["name"] == "test_pipeline"
    assert data["embedder"] == "simple"


@pytest.mark.asyncio
async def test_delete_pipeline():
    """Test deleting a pipeline."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # Create pipeline
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={"name": "test_pipeline", "embedder": "simple", "segmenter": "identity"},
        )

        # Delete pipeline
        delete_response = await client.delete(
            f"/api/v1/{project_id}/pipelines/test_pipeline"
        )

    assert delete_response.status_code == 204

    # Verify deleted
    async with AsyncClient(app=app, base_url="http://test") as client:
        list_response = await client.get(f"/api/v1/{project_id}/pipelines")
    assert "test_pipeline" not in list_response.json()


@pytest.mark.asyncio
async def test_execute_pipeline():
    """Test executing a pipeline."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # Add source
        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc_001", "content": "Test content"},
        )

        # Create pipeline
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={"name": "test_pipeline", "embedder": "simple", "segmenter": "identity"},
        )

        # Execute pipeline
        execute_response = await client.post(
            f"/api/v1/{project_id}/pipelines/test_pipeline/execute"
        )

    assert execute_response.status_code == 202
    data = execute_response.json()
    assert "execution_id" in data
    assert data["pipeline_name"] == "test_pipeline"
    assert data["status"] in ["pending", "running"]
