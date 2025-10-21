#!/bin/bash

# Data Deployer - Quick Deployment Script
# This script helps deploy the backend using Docker

set -e

echo "🚀 Data Deployer - Backend Deployment"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "📦 Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "📦 Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker installed: $(docker --version)"
echo "✅ Docker Compose installed: $(docker compose version)"
echo ""

# Pull latest code (if in a git repo)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code from Git..."
    git pull origin main || echo "⚠️  Could not pull from Git (may not be needed)"
    echo ""
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down 2>/dev/null || echo "No existing containers to stop"
echo ""

# Build and start containers
echo "🏗️  Building and starting containers..."
docker compose up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check container status
echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "🔍 Testing backend health..."
if curl -f http://localhost/health &> /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend health check failed. Check logs:"
    echo "   docker-compose logs -f"
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Test backend: curl http://localhost"
echo "   2. View logs: docker compose logs -f"
echo "   3. Stop: docker compose down"
echo ""
echo "📚 Full Documentation:"
echo "   - Docker: DOCKER_DEPLOYMENT_GUIDE.md"
echo "   - Complete: COMPLETE_DEPLOYMENT_GUIDE.md"
echo ""
