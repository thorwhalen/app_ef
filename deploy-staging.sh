#!/bin/bash

# Staging Deployment Script for app_ef
# This script deploys app_ef to a staging environment

set -e  # Exit on error

echo "=========================================="
echo "app_ef Staging Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.staging exists
if [ ! -f .env.staging ]; then
    echo -e "${RED}Error: .env.staging file not found${NC}"
    echo "Please copy .env.staging.template to .env.staging and configure it"
    echo "  cp .env.staging.template .env.staging"
    exit 1
fi

# Load environment variables
echo -e "${GREEN}Loading environment variables...${NC}"
export $(grep -v '^#' .env.staging | xargs)

# Validate required environment variables
required_vars=("JWT_SECRET_KEY" "STORAGE_BACKEND")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: Required environment variable $var is not set${NC}"
        exit 1
    fi
done

# Check if JWT_SECRET_KEY is still the default
if [ "$JWT_SECRET_KEY" = "your-staging-secret-key-replace-with-generated-key" ]; then
    echo -e "${RED}Error: JWT_SECRET_KEY is still set to default value${NC}"
    echo "Please generate a secure secret key:"
    echo "  openssl rand -hex 32"
    exit 1
fi

echo -e "${GREEN}Environment validation passed${NC}"

# Pull latest changes (optional)
read -p "Pull latest changes from git? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Pulling latest changes...${NC}"
    git pull
fi

# Build Docker images
echo -e "${GREEN}Building Docker images...${NC}"
docker-compose -f docker-compose.staging.yml build --no-cache

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f docker-compose.staging.yml down

# Start new containers
echo -e "${GREEN}Starting new containers...${NC}"
docker-compose -f docker-compose.staging.yml up -d

# Wait for health check
echo -e "${YELLOW}Waiting for backend to be healthy...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}Backend is healthy!${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Error: Backend failed to become healthy${NC}"
    echo "Check logs with: docker-compose -f docker-compose.staging.yml logs backend"
    exit 1
fi

# Show container status
echo -e "${GREEN}Container status:${NC}"
docker-compose -f docker-compose.staging.yml ps

# Show logs (last 20 lines)
echo -e "${GREEN}Recent logs:${NC}"
docker-compose -f docker-compose.staging.yml logs --tail=20

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Access points:"
echo "  Frontend: http://localhost"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Useful commands:"
echo "  View logs:    docker-compose -f docker-compose.staging.yml logs -f"
echo "  Stop:         docker-compose -f docker-compose.staging.yml down"
echo "  Restart:      docker-compose -f docker-compose.staging.yml restart"
echo "  Shell:        docker-compose -f docker-compose.staging.yml exec backend bash"
echo ""
