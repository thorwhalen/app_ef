"""
Tests for Components API endpoints.
"""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_list_all_components():
    """Test listing all components."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # List components
        components_response = await client.get(f"/api/v1/components/{project_id}")

    assert components_response.status_code == 200
    data = components_response.json()
    assert "embedders" in data
    assert "planarizers" in data
    assert "clusterers" in data
    assert "segmenters" in data
    assert isinstance(data["embedders"], list)
    assert len(data["embedders"]) > 0


@pytest.mark.asyncio
async def test_list_embedders():
    """Test listing embedders."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # List embedders
        response = await client.get(f"/api/v1/components/{project_id}/embedders")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "simple" in data or "char_counts" in data


@pytest.mark.asyncio
async def test_list_clusterers():
    """Test listing clusterers."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project_response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "backend": "filesystem"},
        )
        project_id = project_response.json()["id"]

        # List clusterers
        response = await client.get(f"/api/v1/components/{project_id}/clusterers")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
