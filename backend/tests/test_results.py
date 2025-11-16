"""
Tests for results and visualization endpoints.
"""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_visualization_data_format():
    """Test visualization data has correct format."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project and run pipeline
        project = await client.post(
            "/api/v1/projects",
            json={"name": "Viz Test", "backend": "filesystem"},
        )
        project_id = project.json()["id"]

        # Add sources
        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc1", "content": "First document"},
        )
        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc2", "content": "Second document"},
        )

        # Create pipeline with planarizer
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={
                "name": "viz_pipeline",
                "embedder": "simple",
                "planarizer": "simple_2d",
                "clusterer": "simple_kmeans",
                "num_clusters": 2,
                "segmenter": "identity",
            },
        )

        # Execute pipeline
        await client.post(f"/api/v1/{project_id}/pipelines/viz_pipeline/execute")

        # Wait for completion
        import asyncio
        await asyncio.sleep(2)

        # Get visualization data
        response = await client.get(f"/api/v1/{project_id}/results/visualization")

    assert response.status_code == 200
    data = response.json()

    # Check structure
    assert "embeddings" in data
    assert "clusters" in data
    assert "labels" in data
    assert "metadata" in data

    # Check embeddings are 2D arrays
    assert isinstance(data["embeddings"], list)
    if len(data["embeddings"]) > 0:
        assert isinstance(data["embeddings"][0], list)
        assert len(data["embeddings"][0]) == 2  # 2D coordinates

    # Check metadata
    assert "num_points" in data["metadata"]
    assert "num_clusters" in data["metadata"]
    assert "dimensions" in data["metadata"]


@pytest.mark.asyncio
async def test_segments_retrieval():
    """Test retrieving segments."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await client.post(
            "/api/v1/projects",
            json={"name": "Segments Test", "backend": "filesystem"},
        )
        project_id = project.json()["id"]

        # Add source
        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "test", "content": "Test content"},
        )

        # Create and run pipeline
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={"name": "seg_pipe", "embedder": "simple", "segmenter": "identity"},
        )
        await client.post(f"/api/v1/{project_id}/pipelines/seg_pipe/execute")

        import asyncio
        await asyncio.sleep(2)

        # Get segments
        response = await client.get(f"/api/v1/{project_id}/results/segments")

    assert response.status_code == 200
    segments = response.json()
    assert isinstance(segments, dict)
    assert "test" in segments


@pytest.mark.asyncio
async def test_clusters_retrieval():
    """Test retrieving cluster assignments."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await client.post(
            "/api/v1/projects",
            json={"name": "Clusters Test", "backend": "filesystem"},
        )
        project_id = project.json()["id"]

        # Add sources
        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc1", "content": "Document one"},
        )
        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc2", "content": "Document two"},
        )

        # Create pipeline with clustering
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={
                "name": "cluster_pipe",
                "embedder": "simple",
                "clusterer": "simple_kmeans",
                "num_clusters": 2,
                "segmenter": "identity",
            },
        )
        await client.post(f"/api/v1/{project_id}/pipelines/cluster_pipe/execute")

        import asyncio
        await asyncio.sleep(2)

        # Get clusters
        response = await client.get(f"/api/v1/{project_id}/results/clusters")

    assert response.status_code == 200
    clusters = response.json()
    assert isinstance(clusters, dict)
    # Each document should have a cluster assignment
    for cluster_id in clusters.values():
        assert isinstance(cluster_id, int)
        assert cluster_id >= 0
