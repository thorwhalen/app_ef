# Quick Start Guide - app_ef

Get up and running with app_ef development in minutes.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional, but recommended)
- Git

## Initial Setup

### 1. Clone and Navigate

```bash
cd app_ef
```

### 2. Backend Setup

```bash
# Create backend directory structure
mkdir -p backend/app/{api/v1,core,models,services,tasks,middleware,utils}
mkdir -p backend/tests/{unit,integration,e2e}

# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-multipart==0.0.6
aiofiles==23.2.1
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
EOF

# Note: Add 'ef' to requirements once it's published to PyPI
# For now, you may need to install from GitHub:
# pip install git+https://github.com/thorwhalen/ef.git

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
ENVIRONMENT=local
STORAGE_BACKEND=filesystem
LOCAL_STORAGE_PATH=./data
DATABASE_URL=sqlite:///./app_ef.db
LOG_LEVEL=DEBUG
DEBUG=True
ALLOWED_ORIGINS=["http://localhost:3000"]
EOF

# Create main application file
cat > app/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="app_ef API",
    description="API for ef embedding framework",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to app_ef API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
EOF

# Create __init__.py files
touch app/__init__.py
touch app/api/__init__.py
touch app/api/v1/__init__.py
touch app/core/__init__.py
touch app/models/__init__.py
touch app/services/__init__.py
touch app/tasks/__init__.py
touch app/middleware/__init__.py
touch app/utils/__init__.py

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend should now be running at http://localhost:8000

### 3. Frontend Setup

Open a new terminal:

```bash
# Navigate to project root
cd app_ef

# Create frontend with Vite
npm create vite@latest frontend -- --template react-ts

# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Install additional packages
npm install react-router-dom @tanstack/react-query axios zustand
npm install -D tailwindcss postcss autoprefixer
npm install plotly.js react-plotly.js @types/plotly.js

# Initialize Tailwind
npx tailwindcss init -p

# Update tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Update src/index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# Create .env file
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8000
EOF

# Create basic API client
mkdir -p src/services
cat > src/services/api.ts << 'EOF'
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
EOF

# Update App.tsx with a simple test
cat > src/App.tsx << 'EOF'
import { useEffect, useState } from 'react'
import './App.css'
import apiClient from './services/api'

function App() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/')
      .then(response => {
        setMessage(response.data.message)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error:', error)
        setMessage('Failed to connect to backend')
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          app_ef Frontend
        </h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <p className="text-gray-700">{message}</p>
        )}
      </div>
    </div>
  )
}

export default App
EOF

# Start development server
npm run dev
```

The frontend should now be running at http://localhost:3000

### 4. Docker Setup (Optional)

Create Docker configuration:

```bash
# In project root
cd app_ef

# Create backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Create frontend Dockerfile
cat > frontend/Dockerfile.dev << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/app:/app/app
      - ./data:/app/data
    environment:
      - ENVIRONMENT=local
      - STORAGE_BACKEND=filesystem
      - LOCAL_STORAGE_PATH=/app/data
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/src
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  data:
EOF

# Run with Docker
docker-compose up
```

## Verify Installation

### Test Backend

```bash
# In a new terminal
curl http://localhost:8000/health
# Should return: {"status":"healthy"}

curl http://localhost:8000/
# Should return: {"message":"Welcome to app_ef API"}
```

### Test Frontend

Open http://localhost:3000 in your browser. You should see:
- "app_ef Frontend" heading
- Message from the backend API

## Next Steps

### 1. Explore the Plans

- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - High-level architecture and features
- **[TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)** - Detailed technical specs
- **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** - Week-by-week development guide

### 2. Start Development

Follow the **DEVELOPMENT_ROADMAP.md** starting with Phase 1:

1. **Backend**: Implement storage layer and EF wrapper
2. **Backend**: Create Projects API endpoints
3. **Frontend**: Build project management UI
4. **Testing**: Write tests for all components

### 3. Set Up Development Tools

```bash
# Backend linting and formatting
pip install black flake8 mypy
echo "*.py" > .flake8

# Frontend linting
cd frontend
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npx eslint --init
```

### 4. Create First Feature Branch

```bash
git checkout -b feature/storage-layer
# Implement the storage abstraction layer
# Commit and push
git add .
git commit -m "Implement storage abstraction layer"
git push origin feature/storage-layer
```

## Useful Commands

### Backend

```bash
# Run tests
pytest

# Run with auto-reload
uvicorn app.main:app --reload

# Type checking
mypy app/

# Format code
black app/

# Check code style
flake8 app/
```

### Frontend

```bash
# Run dev server
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Docker

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Remove volumes
docker-compose down -v
```

## Common Issues

### Backend won't start

1. Check Python version: `python --version` (should be 3.11+)
2. Verify virtual environment is activated
3. Reinstall dependencies: `pip install -r requirements.txt`
4. Check port 8000 is not in use: `lsof -i :8000` (macOS/Linux)

### Frontend won't start

1. Check Node version: `node --version` (should be 18+)
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check port 3000 is not in use
4. Verify .env file exists with correct API URL

### CORS errors

1. Ensure backend CORS middleware includes frontend URL
2. Check frontend is using correct API base URL
3. Verify both services are running

### Docker issues

1. Ensure Docker daemon is running
2. Check for port conflicts
3. Try: `docker-compose down -v && docker-compose up --build`

## Getting Help

- **Documentation**: See the planning docs in this repository
- **ef Library**: https://github.com/thorwhalen/ef
- **FastAPI**: https://fastapi.tiangolo.com
- **React**: https://react.dev

## Development Tips

1. **Use auto-reload**: Both backend and frontend support hot-reload
2. **Write tests first**: Follow TDD for better code quality
3. **Check API docs**: Visit http://localhost:8000/docs for interactive API documentation
4. **Use TypeScript**: Leverage types to catch errors early
5. **Git commits**: Make small, focused commits with clear messages

---

Happy coding! 🚀

For detailed implementation guidance, proceed to **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)**.
