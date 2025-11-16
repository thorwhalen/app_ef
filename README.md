# app_ef

A modern web application that provides an intuitive interface for the **ef** (Embedding Flow) framework.

## Overview

**app_ef** makes the powerful ef embedding pipeline framework accessible through a user-friendly web interface. Built with FastAPI and React, it enables users to create, manage, and visualize embedding workflows without writing code.

## What is ef?

[ef](https://github.com/thorwhalen/ef) is a lightweight framework for building and executing embedding pipelines with:
- Zero-configuration setup with built-in components
- Flexible component registries (embedders, planarizers, clusterers, segmenters)
- Automatic pipeline composition using DAGs
- Progressive enhancement from simple to production-grade ML

## Features

### Core Capabilities
- **Project Management**: Create and organize embedding projects
- **Document Processing**: Upload and manage source documents
- **Pipeline Builder**: Visual interface for composing embedding workflows
- **Real-time Execution**: Run pipelines with live progress updates
- **Interactive Visualizations**: Explore embeddings and clusters in 2D/3D
- **Export Results**: Download embeddings, clusters, and visualizations

### Technical Highlights
- **Modern Stack**: FastAPI backend + React TypeScript frontend
- **Local & Cloud**: Works locally, scales to cloud deployment
- **Real-time Updates**: WebSocket support for live pipeline status
- **Extensible**: Plugin architecture for custom components
- **Well-tested**: Comprehensive test coverage

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in minutes
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - High-level architecture and roadmap
- **[TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)** - Detailed technical specifications
- **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** - Week-by-week development guide

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional)

### With Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd app_ef

# Start services
docker-compose up
```

- Backend API: http://localhost:8000
- Frontend UI: http://localhost:3000
- API Docs: http://localhost:8000/docs

### Manual Setup

See **[QUICKSTART.md](QUICKSTART.md)** for detailed setup instructions.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  Project Management | Pipeline Builder | Visualizations  │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API / WebSocket
┌─────────────────────▼───────────────────────────────────┐
│                   FastAPI Backend                        │
│  API Endpoints | Background Tasks | Real-time Updates   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                      ef Core                             │
│  Embedding Pipelines | Component Registries | Storage   │
└─────────────────────────────────────────────────────────┘
```

## Development Status

🚧 **This project is currently in the planning phase.**

The comprehensive implementation plan is complete. Development follows a phased approach:

- ✅ **Phase 0**: Planning and architecture (Current)
- 📋 **Phase 1**: Foundation (Weeks 1-2)
- 📋 **Phase 2**: Core features (Weeks 3-4)
- 📋 **Phase 3**: Visualization (Weeks 5-6)
- 📋 **Phase 4**: Real-time features (Weeks 7-8)
- 📋 **Phase 5**: Cloud readiness (Weeks 9-10)
- 📋 **Phase 6**: Testing & docs (Week 11)
- 📋 **Phase 7**: Beta release (Week 12)

See **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** for the complete timeline.

## Contributing

Contributions are welcome! This project follows best practices:

- Test-driven development (TDD)
- Code reviews required
- Type hints and TypeScript strict mode
- Comprehensive documentation
- Semantic versioning

## Technology Stack

**Backend:**
- FastAPI - Modern async Python web framework
- Pydantic - Data validation
- ef - Embedding pipeline framework
- SQLite/PostgreSQL - Database
- Redis - Task queue
- Pytest - Testing

**Frontend:**
- React 18 - UI framework
- TypeScript - Type safety
- Vite - Build tool
- TanStack Query - Data fetching
- Plotly.js - Visualizations
- Tailwind CSS - Styling

**DevOps:**
- Docker & Docker Compose
- GitHub Actions - CI/CD
- Kubernetes - Cloud deployment (future)

## License

[License TBD]

## Acknowledgments

Built on top of the excellent [ef](https://github.com/thorwhalen/ef) framework by Thor Whalen.

---

**Ready to get started?** See **[QUICKSTART.md](QUICKSTART.md)**
