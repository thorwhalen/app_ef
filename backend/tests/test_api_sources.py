"""
Tests for Sources API endpoints.
"""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_add_source():
    """Test adding a source to a project."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First create a project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project for Sources", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # Add a source
        source_response = await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc_001", "content": "This is a test document."},
        )

    assert source_response.status_code == 201
    data = source_response.json()
    assert data["key"] == "doc_001"
    assert data["content"] == "This is a test document."


@pytest.mark.asyncio
async def test_list_sources():
    """Test listing sources."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project and add source
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc_001", "content": "Content 1"},
        )
        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc_002", "content": "Content 2"},
        )

        # List sources
        list_response = await client.get(f"/api/v1/{project_id}/sources")

    assert list_response.status_code == 200
    data = list_response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert "doc_001" in data
    assert "doc_002" in data


@pytest.mark.asyncio
async def test_get_source():
    """Test getting a specific source."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project and add source
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc_001", "content": "Test content"},
        )

        # Get source
        get_response = await client.get(f"/api/v1/{project_id}/sources/doc_001")

    assert get_response.status_code == 200
    data = get_response.json()
    assert data["key"] == "doc_001"
    assert data["content"] == "Test content"


@pytest.mark.asyncio
async def test_delete_source():
    """Test deleting a source."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project and add source
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc_001", "content": "Test content"},
        )

        # Delete source
        delete_response = await client.delete(f"/api/v1/{project_id}/sources/doc_001")

    assert delete_response.status_code == 204

    # Verify deleted
    async with AsyncClient(app=app, base_url="http://test") as client:
        list_response = await client.get(f"/api/v1/{project_id}/sources")
    assert "doc_001" not in list_response.json()


@pytest.mark.asyncio
async def test_bulk_add_sources():
    """Test adding multiple sources at once."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # Add sources in bulk
        bulk_response = await client.post(
            f"/api/v1/{project_id}/sources/bulk",
            json={
                "sources": [
                    {"key": "doc_001", "content": "Content 1"},
                    {"key": "doc_002", "content": "Content 2"},
                    {"key": "doc_003", "content": "Content 3"},
                ]
            },
        )

    assert bulk_response.status_code == 201
    data = bulk_response.json()
    assert "count" in data["detail"]
    assert data["detail"]["count"] == 3
