#!/bin/bash

# Data Deployer - Quick Start Script
# This script helps you get started with the new local Docker build workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   DATA DEPLOYER QUICK START                  ║${NC}"
echo -e "${BLUE}║              Local Docker Build & AWS Deployment             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print colored output
print_step() {
    echo -e "${GREEN}[STEP $1]${NC} $2"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check prerequisites
print_step "1" "Checking Prerequisites"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
else
    print_info "Docker is available: $(docker --version)"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
else
    print_info "Node.js is available: $(node --version)"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
else
    print_info "npm is available: $(npm --version)"
fi

print_success "All prerequisites are installed!"
echo ""

# Install dependencies
print_step "2" "Installing Dependencies"

print_info "Installing frontend dependencies..."
if npm install; then
    print_success "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

print_info "Installing backend dependencies..."
cd server
if npm install; then
    print_success "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi
cd ..

echo ""

# Make scripts executable
print_step "3" "Setting up build script"
chmod +x build-docker-image.sh
print_success "Build script is ready to use"
echo ""

# Show next steps
print_step "4" "Next Steps"
echo ""
echo -e "${PURPLE}To start the Data Deployer application:${NC}"
echo ""
echo -e "${YELLOW}Terminal 1 (Backend):${NC}"
echo "  cd server"
echo "  npm start"
echo "  # Backend will run on http://localhost:3002"
echo ""
echo -e "${YELLOW}Terminal 2 (Frontend):${NC}"
echo "  npm run dev"
echo "  # Frontend will run on http://localhost:5173"
echo ""
echo -e "${PURPLE}To build a Docker image for deployment:${NC}"
echo "  ./build-docker-image.sh"
echo ""
echo -e "${PURPLE}Workflow Overview:${NC}"
echo "  1. 🔨 Build your Docker image locally using the build script"
echo "  2. 🌐 Open the web interface and configure AWS credentials"
echo "  3. 📦 Upload your Docker image tar file"
echo "  4. 🚀 Deploy to AWS ECS with one click"
echo "  5. 📊 Monitor real-time deployment progress"
echo ""
echo -e "${GREEN}📚 Documentation:${NC}"
echo "  • ${BLUE}LOCAL_DOCKER_GUIDE.md${NC} - Complete guide for local Docker builds"
echo "  • ${BLUE}README.md${NC} - Updated setup and usage instructions"
echo ""
echo -e "${GREEN}🎯 Key Benefits of Local Building:${NC}"
echo "  ✅ Faster builds (no cloud build time)"
echo "  ✅ Better control (test locally first)"
echo "  ✅ Offline capable (build without internet)"
echo "  ✅ Cost effective (no CodeBuild charges)"
echo "  ✅ Secure (code stays on your machine)"
echo ""
echo -e "${YELLOW}Ready to deploy? Run the commands above to get started!${NC}"
