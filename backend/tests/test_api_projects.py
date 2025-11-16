"""
Tests for Projects API endpoints.
"""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    """Test health check endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_create_project():
    """Test creating a new project."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/projects",
            json={
                "name": "Test Project",
                "backend": "filesystem",
                "description": "A test project",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["backend"] == "filesystem"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_list_projects():
    """Test listing projects."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First create a project
        create_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project for List", "backend": "filesystem"},
        )
        assert create_response.status_code == 201

        # Then list projects
        list_response = await client.get("/api/v1/projects")

    assert list_response.status_code == 200
    data = list_response.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_get_project():
    """Test getting a specific project."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create a project
        create_response = await client.post(
            "/api/v1/projects", json={"name": "Test Get Project", "backend": "filesystem"}
        )
        assert create_response.status_code == 201
        project_id = create_response.json()["id"]

        # Get the project
        get_response = await client.get(f"/api/v1/projects/{project_id}")

    assert get_response.status_code == 200
    data = get_response.json()
    assert data["id"] == project_id
    assert data["name"] == "Test Get Project"


@pytest.mark.asyncio
async def test_get_nonexistent_project():
    """Test getting a nonexistent project returns 404."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/projects/nonexistent-id")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project():
    """Test updating a project."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create a project
        create_response = await client.post(
            "/api/v1/projects",
            json={"name": "Original Name", "backend": "filesystem"},
        )
        project_id = create_response.json()["id"]

        # Update the project
        update_response = await client.put(
            f"/api/v1/projects/{project_id}",
            json={"name": "Updated Name", "description": "Updated description"},
        )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_delete_project():
    """Test deleting a project."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create a project
        create_response = await client.post(
            "/api/v1/projects",
            json={"name": "Project to Delete", "backend": "filesystem"},
        )
        project_id = create_response.json()["id"]

        # Delete the project
        delete_response = await client.delete(f"/api/v1/projects/{project_id}")

    assert delete_response.status_code == 204

    # Verify it's deleted
    async with AsyncClient(app=app, base_url="http://test") as client:
        get_response = await client.get(f"/api/v1/projects/{project_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_get_project_summary():
    """Test getting project summary."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create a project
        create_response = await client.post(
            "/api/v1/projects",
            json={"name": "Summary Test Project", "backend": "filesystem"},
        )
        project_id = create_response.json()["id"]

        # Get summary
        summary_response = await client.get(f"/api/v1/projects/{project_id}/summary")

    assert summary_response.status_code == 200
    data = summary_response.json()
    assert data["id"] == project_id
    assert "num_sources" in data
    assert "num_embeddings" in data
    assert "pipelines" in data
