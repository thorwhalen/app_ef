# app_ef User Guide

Welcome to **app_ef**, a web-based interface for the ef (Embedding Flow) framework. This guide will help you get started and make the most of the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding Projects](#understanding-projects)
3. [Working with Sources](#working-with-sources)
4. [Building Pipelines](#building-pipelines)
5. [Viewing Results](#viewing-results)
6. [Advanced Features](#advanced-features)
7. [Tips and Best Practices](#tips-and-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- OR: Python 3.11+ and Node.js 18+ for manual setup

### Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd app_ef
   ```

2. **Start the application:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Manual Setup

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed manual installation instructions.

---

## Understanding Projects

### What is a Project?

A **project** is a workspace that contains:
- **Sources**: Your input documents or text data
- **Pipelines**: Processing workflows for embedding and analysis
- **Results**: Output from pipeline executions (embeddings, clusters, visualizations)

Think of a project as a container for a complete analysis workflow.

### Creating a Project

1. Click **"Create New Project"** in the top navigation
2. Enter a **project name** (e.g., "Document Analysis")
3. Select a **storage backend**:
   - **filesystem**: Store data locally (default, recommended for getting started)
   - **s3**: Store data in AWS S3 (for cloud deployments)
4. Add an optional **description**
5. Click **"Create"**

Your new project will appear in the project list. Click on it to open.

### Managing Projects

- **View all projects**: Click "Projects" in the navigation bar
- **Open a project**: Click on any project card
- **Edit project**: Click the edit icon on a project card
- **Delete project**: Click the delete icon (⚠️ This permanently deletes all data)

---

## Working with Sources

### What are Sources?

**Sources** are your input documents - the raw text data you want to analyze. Each source has:
- **Key**: A unique identifier (e.g., "document_001", "chapter_1")
- **Content**: The actual text content
- **Metadata**: Optional information (author, tags, etc.)

### Adding Sources

#### Method 1: Add Text Manually

1. Open your project
2. Go to the **Sources** section
3. Click **"Add Source"**
4. Enter a unique **key** (e.g., "doc_001")
5. Paste or type your **content**
6. Click **"Add"**

#### Method 2: Upload a File

1. Go to the **Sources** section
2. Click **"Upload File"**
3. Either:
   - **Drag and drop** a file into the upload area
   - **Click** to browse and select a file
4. Supported formats: `.txt`, `.md`, `.csv`, `.json`
5. Click **"Upload"**

The file will be added with its filename as the key.

#### Method 3: Bulk Upload (API)

For adding many sources at once, use the API:

```bash
curl -X POST http://localhost:8000/api/v1/{project_id}/sources/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [
      {"key": "doc1", "content": "First document"},
      {"key": "doc2", "content": "Second document"},
      {"key": "doc3", "content": "Third document"}
    ]
  }'
```

### Viewing Sources

- **List all sources**: View the table in the Sources section
- **View source content**: Click on a source row to expand details
- **Search sources**: Use the search box to filter by key or content

### Deleting Sources

1. Find the source in the list
2. Click the **delete icon** (trash can)
3. Confirm deletion

⚠️ **Warning**: Deleting a source removes it permanently. If pipelines have been run, their results will still reference the old source key.

---

## Building Pipelines

### What are Pipelines?

A **pipeline** is a workflow that processes your sources through a series of steps:

1. **Segmentation**: Break sources into smaller units (documents → segments)
2. **Embedding**: Convert text into numerical vectors
3. **Planarization**: Reduce high-dimensional embeddings to 2D (for visualization)
4. **Clustering**: Group similar segments together

### Pipeline Components

#### Segmenters

How to split your sources:

- **identity**: No splitting (one segment per source)
- **lines**: Split by line breaks
- **words**: Split by words
- **sentences**: Split by sentences (if available)

**When to use:**
- `identity`: When analyzing whole documents
- `lines`: For poetry, code, or line-based text
- `words`: For word-level analysis
- `sentences`: For semantic analysis of paragraphs

#### Embedders

How to convert text to numbers:

- **simple**: Character count-based embedding (fast, good for testing)
- **char_counts**: Character frequency vectors
- **tfidf**: TF-IDF vectors (requires sklearn)
- **sentence_transformer**: Deep learning embeddings (requires transformers)

**When to use:**
- `simple`: Quick testing, proof of concept
- `char_counts`: Language detection, simple similarity
- `tfidf`: Traditional NLP, document classification
- `sentence_transformer`: Semantic similarity, best quality

#### Planarizers (Optional)

Reduce embeddings to 2D for visualization:

- **simple_2d**: Use first 2 dimensions (fast)
- **normalize_2d**: Normalized first 2 dimensions
- **pca**: PCA dimensionality reduction
- **tsne**: t-SNE projection (slow but better separation)
- **umap**: UMAP projection (good balance)

**When to use:**
- `simple_2d`: Quick testing
- `pca`: Linear relationships
- `tsne`: Complex relationships, clear clusters
- `umap`: Best overall visualization

#### Clusterers (Optional)

Group similar segments:

- **simple_kmeans**: K-means clustering (requires num_clusters)
- **threshold**: Distance threshold clustering
- **dbscan**: Density-based clustering
- **hierarchical**: Hierarchical clustering

**When to use:**
- `simple_kmeans`: When you know the number of groups
- `threshold`: When cluster count is unknown
- `dbscan`: For outlier detection
- `hierarchical`: For nested categories

### Creating a Pipeline

1. Open your project
2. Go to the **Pipelines** section
3. Click **"Create Pipeline"**
4. Enter a **pipeline name** (e.g., "basic_analysis")
5. **Select components**:
   - Choose a **Segmenter** (required)
   - Choose an **Embedder** (required)
   - Optionally add a **Planarizer** (for visualization)
   - Optionally add a **Clusterer** (for grouping)
6. If using a clusterer, set **num_clusters** (e.g., 5)
7. Click **"Create"**

### Example Pipeline Configurations

#### Simple Document Analysis
```
Segmenter: identity
Embedder: simple
Planarizer: simple_2d
Clusterer: simple_kmeans (3 clusters)
```
Good for: Quick testing with a few documents

#### Semantic Analysis
```
Segmenter: sentences
Embedder: sentence_transformer
Planarizer: umap
Clusterer: dbscan
```
Good for: Finding themes in large text collections

#### Keyword Extraction
```
Segmenter: words
Embedder: tfidf
Planarizer: pca
Clusterer: simple_kmeans (10 clusters)
```
Good for: Topic modeling and keyword grouping

### Executing a Pipeline

1. Find your pipeline in the **Pipelines** section
2. Click **"Execute"**
3. Watch the **progress bar** update in real-time
4. When complete, the status will show **"Completed"**

**Execution time** depends on:
- Number of sources
- Segmenter complexity
- Embedder type (deep learning is slowest)
- Number of segments produced

### Monitoring Execution

#### Real-time Updates

The UI automatically polls for updates every 2 seconds. You'll see:
- **Status**: pending → running → completed/failed
- **Progress bar**: Visual indication of completion
- **Timestamp**: When execution started

#### WebSocket Streaming (Advanced)

For real-time streaming updates, connect to:
```
ws://localhost:8000/api/v1/ws/executions/{execution_id}
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for details.

### Managing Pipelines

- **View pipelines**: See all pipelines in the Pipelines section
- **Execute multiple times**: Run the same pipeline repeatedly (results are overwritten)
- **Delete pipeline**: Click the delete icon

---

## Viewing Results

### Results Overview

After executing a pipeline, you can view:
- **Visualization**: Interactive 2D scatter plot
- **Segments**: Text segments produced by segmentation
- **Clusters**: Cluster assignments for each segment
- **Embeddings**: Raw numerical vectors (for advanced users)

### Visualization Tab

The **Visualization** tab shows a scatter plot of your planar embeddings.

**Features:**
- **Points**: Each point represents a segment
- **Colors**: Different colors show different clusters
- **Hover**: Hover over points to see segment labels
- **Auto-scaling**: Automatically fits all points in view

**Interpreting the plot:**
- **Proximity**: Points close together are semantically similar
- **Clusters**: Color-coded groups of similar segments
- **Outliers**: Points far from others are unique or different

**Example insights:**
- Documents about similar topics cluster together
- Different writing styles separate into distinct regions
- Outliers may indicate errors or unique content

### Segments Tab

View all text segments produced by the segmentation step.

**Format:**
```
source_key → [segment1, segment2, segment3]
```

**Use cases:**
- Verify segmentation worked correctly
- Find specific text fragments
- Export for further processing

### Clusters Tab

View cluster assignments for each segment.

**Format:**
```
source_key → [cluster_id1, cluster_id2, cluster_id3]
```

Where cluster IDs are integers (0, 1, 2, ...).

**Use cases:**
- Identify which segments belong together
- Count segments per cluster
- Analyze cluster composition

### Embeddings Tab (Advanced)

View raw numerical embeddings.

**Format:**
```
source_key → [[0.1, 0.2, ...], [0.3, 0.4, ...]]
```

**Use cases:**
- Export for external analysis
- Verify embedding dimensions
- Debug pipeline issues

---

## Advanced Features

### Authentication

By default, authentication is **disabled** for easy local use.

#### Enabling Authentication

1. Set environment variable:
   ```bash
   ENABLE_AUTH=true
   ```

2. Restart the application

3. Login credentials (default):
   - **Username**: admin
   - **Password**: admin

⚠️ **Security**: Change the default password in production! See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

#### Using Authentication

1. Navigate to the login page
2. Enter credentials
3. You'll receive a JWT token (stored in browser)
4. Token expires after 30 minutes

### API Access

The full API is available at `http://localhost:8000/api/v1`.

**Popular use cases:**

#### Programmatic Pipeline Execution
```python
import requests

# Create project
project = requests.post('http://localhost:8000/api/v1/projects', json={
    'name': 'My Analysis',
    'backend': 'filesystem'
}).json()
project_id = project['id']

# Add sources
requests.post(f'http://localhost:8000/api/v1/{project_id}/sources/bulk', json={
    'sources': [
        {'key': f'doc_{i}', 'content': f'Document {i} content'}
        for i in range(100)
    ]
})

# Create and execute pipeline
requests.post(f'http://localhost:8000/api/v1/{project_id}/pipelines', json={
    'name': 'auto_pipeline',
    'embedder': 'simple',
    'segmenter': 'identity',
    'planarizer': 'simple_2d',
    'clusterer': 'simple_kmeans',
    'num_clusters': 10
})

execution = requests.post(
    f'http://localhost:8000/api/v1/{project_id}/pipelines/auto_pipeline/execute'
).json()

# Poll for results
import time
while True:
    status = requests.get(
        f'http://localhost:8000/api/v1/{project_id}/pipelines/auto_pipeline/executions/{execution["execution_id"]}'
    ).json()

    if status['status'] == 'completed':
        break
    time.sleep(2)

# Get results
results = requests.get(f'http://localhost:8000/api/v1/{project_id}/results').json()
print(results)
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Batch Processing

For processing large numbers of documents:

1. Use the **bulk source upload** API
2. Choose fast components (`simple` embedder, `identity` segmenter)
3. Monitor execution via WebSocket for real-time updates
4. Consider running multiple projects in parallel

### Exporting Data

#### Export Results as JSON

Access results via API and save:

```bash
curl http://localhost:8000/api/v1/{project_id}/results > results.json
```

#### Export Visualization Data

```bash
curl http://localhost:8000/api/v1/{project_id}/results/visualization > viz_data.json
```

Use this data in external tools like Python (matplotlib), R (ggplot2), or D3.js.

---

## Tips and Best Practices

### Starting Small

1. **Begin with a few sources** (5-10 documents)
2. **Use simple components** first (simple embedder, identity segmenter)
3. **Verify results** look reasonable
4. **Scale up** gradually

### Choosing Components

- **For quick testing**: simple embedder + identity segmenter
- **For semantic analysis**: sentence_transformer + sentences segmenter
- **For visualization**: Always add a planarizer (tsne or umap)
- **For grouping**: Add a clusterer with estimated cluster count

### Performance Tips

- **Segmentation**: More segments = longer processing time
  - `identity`: Fastest (1 segment per source)
  - `sentences`: Moderate
  - `words`: Slowest (many segments)

- **Embedders**: Deep learning is slowest but best quality
  - `simple`: Fastest
  - `tfidf`: Fast
  - `sentence_transformer`: Slowest

- **Large datasets**: Consider using filesystem backend initially, migrate to S3 later

### Organizing Projects

- **One project per analysis task** (e.g., "Customer Reviews Analysis", "Research Papers Clustering")
- **Use descriptive source keys** (e.g., "review_2024_01_15" not "doc1")
- **Name pipelines meaningfully** (e.g., "semantic_5clusters" not "pipeline1")

### Version Control

- **Keep source files backed up** outside the application
- **Document pipeline configurations** in a separate notes file
- **Export important results** regularly

---

## Troubleshooting

### Application Won't Start

**Issue**: Docker containers fail to start

**Solutions:**
1. Check Docker is running: `docker ps`
2. Check ports 80 and 8000 are free: `lsof -i :80` and `lsof -i :8000`
3. Check Docker logs: `docker-compose logs`
4. Try rebuilding: `docker-compose up --build`

### Can't Access Frontend

**Issue**: Browser shows "Connection refused" at http://localhost

**Solutions:**
1. Verify frontend container is running: `docker ps`
2. Check container logs: `docker logs app_ef_frontend`
3. Try accessing API directly: http://localhost:8000/health
4. Clear browser cache and retry

### Pipeline Execution Fails

**Issue**: Pipeline status shows "failed"

**Solutions:**
1. Check you have sources added to the project
2. Verify component names are correct
3. Check backend logs: `docker logs app_ef_backend`
4. Ensure num_clusters is set if using a clusterer
5. Try a simpler pipeline configuration

### No Results After Execution

**Issue**: Pipeline completed but results are empty

**Solutions:**
1. Verify sources were added before pipeline creation
2. Check if pipeline actually ran: look at execution status
3. Try executing the pipeline again
4. Check if results endpoint is accessible: `/api/v1/{project_id}/results`

### Visualization Shows No Data

**Issue**: Visualization tab is empty or shows errors

**Solutions:**
1. Ensure you selected a **planarizer** when creating the pipeline
2. Verify pipeline execution completed successfully
3. Check visualization endpoint: `/api/v1/{project_id}/results/visualization`
4. Ensure at least 2 segments were produced

### Slow Performance

**Issue**: Application is slow or unresponsive

**Solutions:**
1. **Reduce source count**: Start with fewer documents
2. **Use simpler components**: Switch to `simple` embedder
3. **Limit segmentation**: Use `identity` instead of `words`
4. **Check system resources**: Docker may need more memory
5. **Restart containers**: `docker-compose restart`

### Authentication Issues

**Issue**: Login fails or token expires quickly

**Solutions:**
1. Verify authentication is enabled: check `ENABLE_AUTH` environment variable
2. Use correct credentials (default: admin/admin)
3. Token expires after 30 minutes - login again
4. Clear browser localStorage and retry

### File Upload Fails

**Issue**: Cannot upload files via drag-and-drop

**Solutions:**
1. Check file is text-based (.txt, .md, .csv, .json)
2. Ensure file size is reasonable (< 10MB)
3. Verify file encoding is UTF-8
4. Try manual text entry instead

### Lost Data After Restart

**Issue**: Projects/sources disappeared after container restart

**Solutions:**
1. Check Docker volumes are configured: `docker volume ls`
2. Ensure `./data` directory exists and has correct permissions
3. Don't use `docker-compose down -v` (removes volumes)
4. Check docker-compose.yml has volume mounts configured

### API Returns 404

**Issue**: API endpoints return "Not Found"

**Solutions:**
1. Verify project ID is correct
2. Check resource exists: view in UI first
3. Ensure correct URL format: `/api/v1/{project_id}/sources` not `/api/sources`
4. Check API documentation: http://localhost:8000/docs

---

## Getting Help

### Resources

- **API Documentation**: http://localhost:8000/docs (when running)
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Technical Architecture**: [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
- **ef Framework Docs**: https://github.com/thorwhalen/ef

### Reporting Issues

If you encounter bugs or have feature requests:

1. Check existing issues in the GitHub repository
2. Provide clear description of the problem
3. Include:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - System information (OS, Docker version)
   - Relevant logs

---

## Next Steps

Now that you understand the basics:

1. **Create your first project** and add some test sources
2. **Build a simple pipeline** with basic components
3. **Explore the visualization** to understand your data
4. **Try different pipeline configurations** to compare results
5. **Scale up** to your real use case

Happy analyzing! 🚀
