# app_ef Deployment Guide

This guide covers deploying app_ef in various environments, from local development to production cloud deployments.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Manual Deployment](#manual-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Configuration](#configuration)
6. [Security](#security)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Local Development

### Quick Start with Docker

The fastest way to get started:

```bash
# Clone repository
git clone <repository-url>
cd app_ef

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access points:**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Development with Hot Reload

For active development with automatic code reloading:

```bash
# Backend (with hot reload)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (with hot reload)
cd frontend
npm install
npm run dev
```

**Access points:**
- Frontend: http://localhost:5173 (Vite dev server)
- Backend API: http://localhost:8000

---

## Docker Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - DEBUG=false
      - ENABLE_AUTH=true
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - STORAGE_BACKEND=s3
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - AWS_REGION=${AWS_REGION}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    volumes:
      - app-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL}
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  app-data:
    driver: local
```

### Environment Variables

Create `.env.prod`:

```bash
# Application
ENVIRONMENT=production
DEBUG=false
ENABLE_AUTH=true

# Security
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Storage
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=app-ef-data
AWS_REGION=us-east-1

# Frontend
VITE_API_URL=https://api.yourdomain.com
```

### Deploy

```bash
# Load environment variables
export $(cat .env.prod | xargs)

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
curl http://localhost:8000/health
```

---

## Manual Deployment

### Backend Manual Setup

#### Prerequisites

- Python 3.11+
- pip
- virtualenv (recommended)

#### Installation

```bash
# Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Set environment variables
export ENVIRONMENT=production
export DEBUG=false
export ENABLE_AUTH=true
export JWT_SECRET_KEY=your-secret-key

# Run with Gunicorn (production)
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -

# OR run with Uvicorn (development)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### systemd Service (Linux)

Create `/etc/systemd/system/app-ef-backend.service`:

```ini
[Unit]
Description=app_ef Backend API
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/app_ef/backend
Environment="PATH=/opt/app_ef/backend/venv/bin"
EnvironmentFile=/opt/app_ef/.env
ExecStart=/opt/app_ef/backend/venv/bin/gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable app-ef-backend
sudo systemctl start app-ef-backend
sudo systemctl status app-ef-backend
```

### Frontend Manual Setup

#### Prerequisites

- Node.js 18+
- npm or yarn

#### Installation

```bash
# Install dependencies
cd frontend
npm install

# Build for production
npm run build

# Output will be in ./dist directory
```

#### Serve with Nginx

Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

Create `/etc/nginx/sites-available/app-ef`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /opt/app_ef/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /api/v1/ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/app-ef /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Cloud Deployment

### AWS Deployment

#### Architecture

- **Frontend**: S3 + CloudFront
- **Backend**: ECS Fargate or EC2
- **Storage**: S3
- **Database** (future): RDS PostgreSQL
- **Load Balancer**: Application Load Balancer

#### S3 Backend Configuration

```python
# backend/app/core/config.py
class Settings(BaseSettings):
    storage_backend: str = "s3"
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_s3_bucket: str = "app-ef-data"
    aws_region: str = "us-east-1"
```

Create S3 bucket:

```bash
aws s3 mb s3://app-ef-data --region us-east-1

# Set CORS
aws s3api put-bucket-cors --bucket app-ef-data --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"]
  }]
}'
```

#### ECS Fargate Deployment

Create `task-definition.json`:

```json
{
  "family": "app-ef-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-ecr-repo/app-ef-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "ENVIRONMENT", "value": "production"},
        {"name": "STORAGE_BACKEND", "value": "s3"},
        {"name": "AWS_S3_BUCKET", "value": "app-ef-data"}
      ],
      "secrets": [
        {
          "name": "JWT_SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:app-ef/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/app-ef",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    }
  ]
}
```

Deploy:

```bash
# Build and push Docker image
docker build -t app-ef-backend ./backend
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag app-ef-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/app-ef-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/app-ef-backend:latest

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster app-ef-cluster \
  --service-name app-ef-backend \
  --task-definition app-ef-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Google Cloud Platform (GCP)

#### Cloud Run Deployment

```bash
# Build and deploy backend
cd backend
gcloud builds submit --tag gcr.io/PROJECT-ID/app-ef-backend
gcloud run deploy app-ef-backend \
  --image gcr.io/PROJECT-ID/app-ef-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production,STORAGE_BACKEND=gcs \
  --set-env-vars GCS_BUCKET=app-ef-data

# Deploy frontend to Cloud Storage + Cloud CDN
cd ../frontend
npm run build
gsutil -m cp -r dist/* gs://app-ef-frontend/
gsutil web set -m index.html -e index.html gs://app-ef-frontend
```

### Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-ef-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app-ef-backend
  template:
    metadata:
      labels:
        app: app-ef-backend
    spec:
      containers:
      - name: backend
        image: your-registry/app-ef-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: STORAGE_BACKEND
          value: "s3"
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-ef-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: app-ef-backend
spec:
  selector:
    app: app-ef-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

Deploy:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl get services app-ef-backend
```

---

## Configuration

### Environment Variables Reference

#### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `local` | Environment name (local, development, staging, production) |
| `DEBUG` | `false` | Enable debug mode |
| `ENABLE_AUTH` | `false` | Enable JWT authentication |
| `JWT_SECRET_KEY` | `dev-secret` | Secret key for JWT tokens (CHANGE IN PRODUCTION!) |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token expiration time |
| `STORAGE_BACKEND` | `filesystem` | Storage backend (filesystem, s3, gcs) |
| `DATA_DIR` | `./data` | Local data directory (filesystem backend) |
| `AWS_ACCESS_KEY_ID` | - | AWS access key (S3 backend) |
| `AWS_SECRET_ACCESS_KEY` | - | AWS secret key (S3 backend) |
| `AWS_S3_BUCKET` | - | S3 bucket name |
| `AWS_REGION` | `us-east-1` | AWS region |
| `ALLOWED_ORIGINS` | `http://localhost,http://localhost:80` | CORS allowed origins |

#### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

### Configuration Files

#### Backend Config (`backend/app/core/config.py`)

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    app_name: str = "app_ef"
    environment: str = "local"
    debug: bool = False

    # Auth
    enable_auth: bool = False
    jwt_secret_key: str = "development-secret-key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Storage
    storage_backend: str = "filesystem"
    data_dir: str = "./data"

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "us-east-1"

    # CORS
    allowed_origins: List[str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

---

## Security

### Production Security Checklist

- [ ] Change default JWT secret key
- [ ] Enable authentication (`ENABLE_AUTH=true`)
- [ ] Change default admin password
- [ ] Use HTTPS/TLS for all traffic
- [ ] Configure CORS properly (restrict origins)
- [ ] Use environment variables for secrets (never commit to git)
- [ ] Enable firewall rules (allow only necessary ports)
- [ ] Implement rate limiting
- [ ] Regular security updates
- [ ] Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable audit logging
- [ ] Implement backup strategy

### HTTPS/TLS Setup

#### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured by Certbot)
sudo systemctl status certbot.timer
```

#### Nginx HTTPS Configuration

Update `/etc/nginx/sites-available/app-ef`:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of configuration
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Secrets Management

#### Using AWS Secrets Manager

```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# In config.py
if settings.environment == "production":
    secrets = get_secret("app-ef/production")
    settings.jwt_secret_key = secrets['jwt_secret_key']
```

---

## Monitoring and Logging

### Application Logging

Backend uses Python's logging module:

```python
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# In production, configure to write to file or cloud service
handler = logging.FileHandler('/var/log/app-ef/backend.log')
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
```

### Health Checks

Backend provides `/health` endpoint:

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-16T10:30:00Z"
}
```

### Monitoring with Prometheus

Add Prometheus metrics to backend:

```python
# requirements.txt
prometheus-fastapi-instrumentator

# app/main.py
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(...)
Instrumentator().instrument(app).expose(app)
```

Access metrics at: http://localhost:8000/metrics

### CloudWatch Logs (AWS)

Configure in ECS task definition:

```json
"logConfiguration": {
  "logDriver": "awslogs",
  "options": {
    "awslogs-group": "/ecs/app-ef",
    "awslogs-region": "us-east-1",
    "awslogs-stream-prefix": "backend"
  }
}
```

---

## Backup and Recovery

### Filesystem Backend

```bash
# Backup
tar -czf app-ef-backup-$(date +%Y%m%d).tar.gz data/

# Restore
tar -xzf app-ef-backup-20251116.tar.gz
```

### S3 Backend

Data is already in S3, but enable versioning:

```bash
aws s3api put-bucket-versioning \
  --bucket app-ef-data \
  --versioning-configuration Status=Enabled
```

Backup to another region:

```bash
# Enable cross-region replication
aws s3api put-bucket-replication \
  --bucket app-ef-data \
  --replication-configuration file://replication.json
```

### Database Backup (Future)

When using PostgreSQL:

```bash
# Backup
pg_dump -h localhost -U appef_user appef_db > backup.sql

# Restore
psql -h localhost -U appef_user appef_db < backup.sql
```

---

## Scaling

### Horizontal Scaling

#### Backend

Run multiple backend instances behind a load balancer:

```bash
# Docker Compose
docker-compose up -d --scale backend=4
```

#### Database Considerations

When scaling, consider:
- Use external database (PostgreSQL, Redis)
- Shared session storage
- Distributed caching

### Vertical Scaling

Increase resources per container:

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Auto-scaling (AWS)

Configure ECS auto-scaling:

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/app-ef-cluster/app-ef-backend \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/app-ef-cluster/app-ef-backend \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

---

## Troubleshooting

### Check Service Status

```bash
# Docker
docker-compose ps
docker-compose logs backend
docker-compose logs frontend

# Systemd
sudo systemctl status app-ef-backend
sudo journalctl -u app-ef-backend -f

# Kubernetes
kubectl get pods
kubectl logs -f deployment/app-ef-backend
kubectl describe pod <pod-name>
```

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :8000
# or
netstat -tulpn | grep :8000

# Kill process
kill -9 <PID>
```

#### Permission Denied (Data Directory)

```bash
# Fix permissions
sudo chown -R $(whoami):$(whoami) data/
chmod -R 755 data/
```

#### Docker Build Fails

```bash
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache
```

#### High Memory Usage

```bash
# Check container stats
docker stats

# Limit container memory
docker-compose up -d --scale backend=2 --memory="2g"
```

---

## Production Deployment Workflow

### 1. Preparation

```bash
# Set environment variables
export ENVIRONMENT=production
export ENABLE_AUTH=true
export JWT_SECRET_KEY=$(openssl rand -hex 32)

# Create .env.prod file
cat > .env.prod << EOF
ENVIRONMENT=production
DEBUG=false
ENABLE_AUTH=true
JWT_SECRET_KEY=${JWT_SECRET_KEY}
STORAGE_BACKEND=s3
AWS_S3_BUCKET=app-ef-prod-data
ALLOWED_ORIGINS=https://app.yourdomain.com
EOF
```

### 2. Build

```bash
# Build Docker images
docker-compose -f docker-compose.prod.yml build
```

### 3. Test

```bash
# Run tests
cd backend
pytest tests/

# Security scan
docker scan app-ef-backend:latest
```

### 4. Deploy

```bash
# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl https://app.yourdomain.com/api/v1/health
```

### 5. Monitor

```bash
# Watch logs
docker-compose -f docker-compose.prod.yml logs -f

# Check metrics
curl http://localhost:8000/metrics
```

---

## Rollback

If deployment fails:

```bash
# Docker
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend

# Kubernetes
kubectl rollout undo deployment/app-ef-backend
kubectl rollout status deployment/app-ef-backend
```

---

## Next Steps

- Set up CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins)
- Implement comprehensive monitoring (Prometheus + Grafana)
- Configure alerting (PagerDuty, Slack)
- Regular security audits
- Performance testing and optimization
- Database migration strategy (when needed)

For more information, see:
- [USER_GUIDE.md](./USER_GUIDE.md) - End-user documentation
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API reference
- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) - Architecture details
