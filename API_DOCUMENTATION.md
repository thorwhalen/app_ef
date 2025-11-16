# app_ef API Documentation

Version: 0.1.0

## Overview

The app_ef API provides a RESTful interface for managing embedding flow projects, sources, pipelines, and results. The API is built with FastAPI and supports both HTTP/REST and WebSocket protocols for real-time updates.

**Base URL (Local):** `http://localhost:8000`

**API Prefix:** `/api/v1`

## Authentication

Authentication is **optional** and disabled by default. When enabled, the API uses JWT (JSON Web Tokens) for authentication.

### Enabling Authentication

Set environment variable: `ENABLE_AUTH=true`

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Using Tokens

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "username": "admin",
  "user_id": "admin-001"
}
```

## API Endpoints

### Health Check

#### GET /health

Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-16T10:30:00Z"
}
```

---

## Projects

### Create Project

```http
POST /api/v1/projects
Content-Type: application/json

{
  "name": "My Project",
  "backend": "filesystem",
  "description": "Optional description"
}
```

**Parameters:**
- `name` (string, required): Project name
- `backend` (string, optional): Storage backend ("filesystem" or "s3", default: "filesystem")
- `description` (string, optional): Project description

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Project",
  "backend": "filesystem",
  "description": "Optional description",
  "created_at": "2025-11-16T10:30:00Z"
}
```

### List Projects

```http
GET /api/v1/projects
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Project",
    "backend": "filesystem",
    "created_at": "2025-11-16T10:30:00Z"
  }
]
```

### Get Project

```http
GET /api/v1/projects/{project_id}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Project",
  "backend": "filesystem",
  "description": "Optional description",
  "created_at": "2025-11-16T10:30:00Z"
}
```

**Error (404 Not Found):**
```json
{
  "detail": "Project not found"
}
```

### Update Project

```http
PUT /api/v1/projects/{project_id}
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "New description"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Project Name",
  "description": "New description",
  "backend": "filesystem",
  "created_at": "2025-11-16T10:30:00Z"
}
```

### Delete Project

```http
DELETE /api/v1/projects/{project_id}
```

**Response (204 No Content)**

### Get Project Summary

```http
GET /api/v1/{project_id}/summary
```

**Response (200 OK):**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Project",
  "num_sources": 42,
  "num_pipelines": 3,
  "has_results": true,
  "created_at": "2025-11-16T10:30:00Z"
}
```

---

## Sources

### Add Source

```http
POST /api/v1/{project_id}/sources
Content-Type: application/json

{
  "key": "document_001",
  "content": "This is the document content...",
  "metadata": {
    "author": "John Doe",
    "tags": ["ml", "nlp"]
  }
}
```

**Parameters:**
- `key` (string, required): Unique identifier for the source
- `content` (string, required): Source content
- `metadata` (object, optional): Additional metadata

**Response (201 Created):**
```json
{
  "key": "document_001",
  "content": "This is the document content...",
  "metadata": {
    "author": "John Doe",
    "tags": ["ml", "nlp"]
  },
  "created_at": "2025-11-16T10:30:00Z"
}
```

### Upload Source File

```http
POST /api/v1/{project_id}/sources/upload
Content-Type: multipart/form-data

file: <binary file data>
```

**Response (201 Created):**
```json
{
  "key": "uploaded_file.txt",
  "content": "File content...",
  "metadata": {
    "filename": "uploaded_file.txt",
    "size": 1024,
    "mime_type": "text/plain"
  }
}
```

### Bulk Add Sources

```http
POST /api/v1/{project_id}/sources/bulk
Content-Type: application/json

{
  "sources": [
    {"key": "doc1", "content": "First document"},
    {"key": "doc2", "content": "Second document"},
    {"key": "doc3", "content": "Third document"}
  ]
}
```

**Response (201 Created):**
```json
{
  "added": 3,
  "failed": 0,
  "sources": ["doc1", "doc2", "doc3"]
}
```

### List Sources

```http
GET /api/v1/{project_id}/sources
```

**Response (200 OK):**
```json
[
  {
    "key": "document_001",
    "content": "This is the document content...",
    "metadata": {},
    "created_at": "2025-11-16T10:30:00Z"
  }
]
```

### Get Source

```http
GET /api/v1/{project_id}/sources/{source_key}
```

**Response (200 OK):**
```json
{
  "key": "document_001",
  "content": "This is the document content...",
  "metadata": {},
  "created_at": "2025-11-16T10:30:00Z"
}
```

### Delete Source

```http
DELETE /api/v1/{project_id}/sources/{source_key}
```

**Response (204 No Content)**

---

## Components

### List Available Components

```http
GET /api/v1/components/{project_id}
```

**Response (200 OK):**
```json
{
  "embedders": [
    {
      "name": "simple",
      "description": "Simple embedder using character counts",
      "parameters": {}
    },
    {
      "name": "char_counts",
      "description": "Character frequency embedder",
      "parameters": {}
    }
  ],
  "planarizers": [
    {
      "name": "simple_2d",
      "description": "Simple 2D projection using first 2 dimensions",
      "parameters": {}
    },
    {
      "name": "normalize_2d",
      "description": "Normalized 2D projection",
      "parameters": {}
    }
  ],
  "clusterers": [
    {
      "name": "simple_kmeans",
      "description": "Simple K-means clustering",
      "parameters": {
        "num_clusters": "Number of clusters (default: 3)"
      }
    },
    {
      "name": "threshold",
      "description": "Threshold-based clustering",
      "parameters": {
        "threshold": "Distance threshold (default: 0.5)"
      }
    }
  ],
  "segmenters": [
    {
      "name": "identity",
      "description": "Identity segmenter (no segmentation)",
      "parameters": {}
    },
    {
      "name": "lines",
      "description": "Line-based segmentation",
      "parameters": {}
    },
    {
      "name": "words",
      "description": "Word-based segmentation",
      "parameters": {}
    }
  ]
}
```

---

## Pipelines

### Create Pipeline

```http
POST /api/v1/{project_id}/pipelines
Content-Type: application/json

{
  "name": "my_pipeline",
  "embedder": "simple",
  "planarizer": "simple_2d",
  "clusterer": "simple_kmeans",
  "num_clusters": 5,
  "segmenter": "identity"
}
```

**Parameters:**
- `name` (string, required): Pipeline name
- `embedder` (string, required): Embedder component name
- `segmenter` (string, required): Segmenter component name
- `planarizer` (string, optional): Planarizer component name
- `clusterer` (string, optional): Clusterer component name
- `num_clusters` (integer, optional): Number of clusters (required if using clusterer)

**Response (201 Created):**
```json
{
  "name": "my_pipeline",
  "config": {
    "embedder": "simple",
    "planarizer": "simple_2d",
    "clusterer": "simple_kmeans",
    "num_clusters": 5,
    "segmenter": "identity"
  },
  "created_at": "2025-11-16T10:30:00Z"
}
```

### List Pipelines

```http
GET /api/v1/{project_id}/pipelines
```

**Response (200 OK):**
```json
[
  {
    "name": "my_pipeline",
    "config": {
      "embedder": "simple",
      "planarizer": "simple_2d",
      "clusterer": "simple_kmeans",
      "num_clusters": 5,
      "segmenter": "identity"
    },
    "created_at": "2025-11-16T10:30:00Z"
  }
]
```

### Get Pipeline

```http
GET /api/v1/{project_id}/pipelines/{pipeline_name}
```

**Response (200 OK):**
```json
{
  "name": "my_pipeline",
  "config": {
    "embedder": "simple",
    "planarizer": "simple_2d",
    "clusterer": "simple_kmeans",
    "num_clusters": 5,
    "segmenter": "identity"
  },
  "created_at": "2025-11-16T10:30:00Z"
}
```

### Execute Pipeline

```http
POST /api/v1/{project_id}/pipelines/{pipeline_name}/execute
```

**Response (202 Accepted):**
```json
{
  "execution_id": "exec-123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "started_at": "2025-11-16T10:30:00Z"
}
```

### Get Execution Status

```http
GET /api/v1/{project_id}/pipelines/{pipeline_name}/executions/{execution_id}
```

**Response (200 OK):**
```json
{
  "execution_id": "exec-123e4567-e89b-12d3-a456-426614174000",
  "status": "running",
  "progress": 65.5,
  "started_at": "2025-11-16T10:30:00Z",
  "updated_at": "2025-11-16T10:30:15Z"
}
```

**Status values:**
- `pending`: Execution queued
- `running`: Execution in progress
- `completed`: Execution finished successfully
- `failed`: Execution failed

### List Pipeline Executions

```http
GET /api/v1/{project_id}/pipelines/{pipeline_name}/executions
```

**Response (200 OK):**
```json
[
  {
    "execution_id": "exec-123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "started_at": "2025-11-16T10:30:00Z",
    "completed_at": "2025-11-16T10:30:45Z"
  }
]
```

### Delete Pipeline

```http
DELETE /api/v1/{project_id}/pipelines/{pipeline_name}
```

**Response (204 No Content)**

---

## Results

### Get All Results

```http
GET /api/v1/{project_id}/results
```

**Response (200 OK):**
```json
{
  "segments": {
    "doc1": ["First segment", "Second segment"],
    "doc2": ["Another segment"]
  },
  "embeddings": {
    "doc1": [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
    "doc2": [[0.7, 0.8, 0.9]]
  },
  "planar": {
    "doc1": [[1.2, 3.4], [5.6, 7.8]],
    "doc2": [[9.0, 1.1]]
  },
  "clusters": {
    "doc1": [0, 1],
    "doc2": [0]
  }
}
```

### Get Segments

```http
GET /api/v1/{project_id}/results/segments
```

**Response (200 OK):**
```json
{
  "doc1": ["First segment", "Second segment"],
  "doc2": ["Another segment"]
}
```

### Get Embeddings

```http
GET /api/v1/{project_id}/results/embeddings
```

**Response (200 OK):**
```json
{
  "doc1": [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
  "doc2": [[0.7, 0.8, 0.9]]
}
```

### Get Planar Embeddings

```http
GET /api/v1/{project_id}/results/planar
```

**Response (200 OK):**
```json
{
  "doc1": [[1.2, 3.4], [5.6, 7.8]],
  "doc2": [[9.0, 1.1]]
}
```

### Get Clusters

```http
GET /api/v1/{project_id}/results/clusters
```

**Response (200 OK):**
```json
{
  "doc1": [0, 1],
  "doc2": [0]
}
```

### Get Visualization Data

```http
GET /api/v1/{project_id}/results/visualization
```

**Response (200 OK):**
```json
{
  "embeddings": [
    [1.2, 3.4],
    [5.6, 7.8],
    [9.0, 1.1]
  ],
  "clusters": [0, 1, 0],
  "labels": ["doc1_seg0", "doc1_seg1", "doc2_seg0"],
  "metadata": {
    "num_points": 3,
    "num_clusters": 2,
    "dimensions": 2
  }
}
```

---

## WebSocket API

### Pipeline Execution Updates

Connect to receive real-time updates for a pipeline execution:

```
ws://localhost:8000/api/v1/ws/executions/{execution_id}
```

**Message Format:**
```json
{
  "execution_id": "exec-123e4567-e89b-12d3-a456-426614174000",
  "status": "running",
  "progress": 75.0,
  "started_at": "2025-11-16T10:30:00Z",
  "updated_at": "2025-11-16T10:30:20Z"
}
```

**Example (JavaScript):**
```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/executions/exec-123...');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(`Status: ${update.status}, Progress: ${update.progress}%`);

  if (update.status === 'completed' || update.status === 'failed') {
    ws.close();
  }
};
```

---

## Error Codes

### HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **202 Accepted**: Request accepted for processing
- **204 No Content**: Request successful, no content to return
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **500 Internal Server Error**: Server error
- **501 Not Implemented**: Feature not enabled

### Error Response Format

```json
{
  "detail": "Error message description"
}
```

### Validation Errors (422)

```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. This may be added in future versions.

---

## CORS

The API supports Cross-Origin Resource Sharing (CORS). Default configuration:

- **Allowed Origins**: `http://localhost`, `http://localhost:80`, `http://localhost:3000`
- **Allowed Methods**: All
- **Allowed Headers**: All
- **Allow Credentials**: Yes

Configure via environment variables:
```bash
ALLOWED_ORIGINS=http://example.com,http://app.example.com
```

---

## Pagination

Currently, list endpoints return all items. Pagination may be added in future versions.

**Planned format:**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "pages": 5
}
```

---

## Versioning

The API uses URL versioning with the prefix `/api/v1`. Future versions will be available at `/api/v2`, etc.

Current version: **v1**

---

## OpenAPI / Swagger

Interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## Support

For issues and feature requests, please visit the GitHub repository.
