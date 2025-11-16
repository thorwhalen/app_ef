"""
Integration tests for the complete workflow.
Tests the entire flow from project creation to results visualization.
"""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_complete_workflow():
    """Test the complete workflow from project to results."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 1. Create a project
        project_response = await client.post(
            "/api/v1/projects",
            json={
                "name": "Complete Workflow Test",
                "backend": "filesystem",
                "description": "Testing complete workflow",
            },
        )
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]

        # 2. Add sources
        source1 = await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc_001", "content": "Machine learning is fascinating."},
        )
        assert source1.status_code == 201

        source2 = await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "doc_002", "content": "Deep learning networks are powerful."},
        )
        assert source2.status_code == 201

        # 3. List sources
        sources_list = await client.get(f"/api/v1/{project_id}/sources")
        assert sources_list.status_code == 200
        assert len(sources_list.json()) == 2

        # 4. List available components
        components = await client.get(f"/api/v1/components/{project_id}")
        assert components.status_code == 200
        assert "embedders" in components.json()

        # 5. Create a pipeline
        pipeline = await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={
                "name": "test_pipeline",
                "embedder": "simple",
                "planarizer": "simple_2d",
                "clusterer": "simple_kmeans",
                "num_clusters": 2,
                "segmenter": "identity",
            },
        )
        assert pipeline.status_code == 201

        # 6. Execute the pipeline
        execution = await client.post(
            f"/api/v1/{project_id}/pipelines/test_pipeline/execute"
        )
        assert execution.status_code == 202
        execution_id = execution.json()["execution_id"]

        # 7. Check execution status
        import asyncio
        await asyncio.sleep(2)  # Wait for execution

        status = await client.get(
            f"/api/v1/{project_id}/pipelines/test_pipeline/executions/{execution_id}"
        )
        assert status.status_code == 200
        assert status.json()["status"] in ["completed", "running", "pending"]

        # 8. Get results (if completed)
        results = await client.get(f"/api/v1/{project_id}/results")
        assert results.status_code == 200

        # 9. Get visualization data
        viz = await client.get(f"/api/v1/{project_id}/results/visualization")
        assert viz.status_code == 200
        viz_data = viz.json()
        assert "embeddings" in viz_data
        assert "labels" in viz_data

        # 10. Get project summary
        summary = await client.get(f"/api/v1/{project_id}/summary")
        assert summary.status_code == 200
        assert summary.json()["num_sources"] == 2
        assert summary.json()["num_pipelines"] == 1

        # 11. Delete the project
        delete_response = await client.delete(f"/api/v1/{project_id}")
        assert delete_response.status_code == 204


@pytest.mark.asyncio
async def test_bulk_operations():
    """Test bulk source operations."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project = await client.post(
            "/api/v1/projects",
            json={"name": "Bulk Test", "backend": "filesystem"},
        )
        project_id = project.json()["id"]

        # Bulk add sources
        bulk_response = await client.post(
            f"/api/v1/{project_id}/sources/bulk",
            json={
                "sources": [
                    {"key": f"doc_{i:03d}", "content": f"Document {i} content"}
                    for i in range(10)
                ]
            },
        )
        assert bulk_response.status_code == 201

        # Verify all sources added
        sources = await client.get(f"/api/v1/{project_id}/sources")
        assert len(sources.json()) == 10


@pytest.mark.asyncio
async def test_pipeline_validation():
    """Test pipeline creation with various configurations."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project = await client.post(
            "/api/v1/projects",
            json={"name": "Pipeline Validation Test", "backend": "filesystem"},
        )
        project_id = project.json()["id"]

        # Test minimal pipeline (embedder + segmenter only)
        minimal = await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={"name": "minimal", "embedder": "simple", "segmenter": "identity"},
        )
        assert minimal.status_code == 201

        # Test full pipeline (all components)
        full = await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={
                "name": "full_pipeline",
                "embedder": "char_counts",
                "planarizer": "normalize_2d",
                "clusterer": "threshold",
                "num_clusters": 5,
                "segmenter": "lines",
            },
        )
        assert full.status_code == 201

        # Verify both pipelines exist
        pipelines = await client.get(f"/api/v1/{project_id}/pipelines")
        assert len(pipelines.json()) == 2


@pytest.mark.asyncio
async def test_error_handling():
    """Test error handling for invalid operations."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Test accessing non-existent project
        response = await client.get("/api/v1/projects/nonexistent-id")
        assert response.status_code == 404

        # Test accessing non-existent source
        project = await client.post(
            "/api/v1/projects",
            json={"name": "Error Test", "backend": "filesystem"},
        )
        project_id = project.json()["id"]

        source_response = await client.get(
            f"/api/v1/{project_id}/sources/nonexistent"
        )
        assert source_response.status_code == 404

        # Test accessing non-existent pipeline
        pipeline_response = await client.get(
            f"/api/v1/{project_id}/pipelines/nonexistent"
        )
        assert pipeline_response.status_code == 404


@pytest.mark.asyncio
async def test_results_retrieval():
    """Test retrieving different types of results."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project and add source
        project = await client.post(
            "/api/v1/projects",
            json={"name": "Results Test", "backend": "filesystem"},
        )
        project_id = project.json()["id"]

        await client.post(
            f"/api/v1/{project_id}/sources",
            json={"key": "test_doc", "content": "Test content for embeddings."},
        )

        # Create and execute pipeline
        await client.post(
            f"/api/v1/{project_id}/pipelines",
            json={
                "name": "results_pipeline",
                "embedder": "simple",
                "planarizer": "simple_2d",
                "clusterer": "simple_kmeans",
                "num_clusters": 2,
                "segmenter": "identity",
            },
        )

        await client.post(f"/api/v1/{project_id}/pipelines/results_pipeline/execute")

        # Wait for execution
        import asyncio
        await asyncio.sleep(2)

        # Test different result endpoints
        segments = await client.get(f"/api/v1/{project_id}/results/segments")
        assert segments.status_code == 200

        embeddings = await client.get(f"/api/v1/{project_id}/results/embeddings")
        assert embeddings.status_code == 200

        planar = await client.get(f"/api/v1/{project_id}/results/planar")
        assert planar.status_code == 200

        clusters = await client.get(f"/api/v1/{project_id}/results/clusters")
        assert clusters.status_code == 200

        all_results = await client.get(f"/api/v1/{project_id}/results")
        assert all_results.status_code == 200
        assert "segments" in all_results.json()
        assert "embeddings" in all_results.json()
