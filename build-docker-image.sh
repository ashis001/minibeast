#!/bin/bash

# Data Deployer - Local Docker Image Builder
# This script helps you build Docker images locally and save them as tar files for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Data Deployer - Local Docker Image Builder ===${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

print_status "Docker is available: $(docker --version)"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BUILD_DIR="$SCRIPT_DIR/docker-build"

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

echo ""
echo -e "${BLUE}Step 1: Prepare your application files${NC}"
echo "Please ensure you have the following files ready:"
echo "  • Python application file (e.g., app.py, main.py)"
echo "  • requirements.txt with your Python dependencies"
echo "  • (Optional) Custom Dockerfile"
echo ""

# Prompt for application file
read -p "Enter the path to your Python application file: " APP_FILE
if [[ ! -f "$APP_FILE" ]]; then
    print_error "Application file not found: $APP_FILE"
    exit 1
fi

# Get the filename without path
APP_FILENAME=$(basename "$APP_FILE")
print_status "Using application file: $APP_FILENAME"

# Copy application file to build directory
cp "$APP_FILE" "$BUILD_DIR/"

# Prompt for requirements.txt
read -p "Enter the path to your requirements.txt file: " REQUIREMENTS_FILE
if [[ ! -f "$REQUIREMENTS_FILE" ]]; then
    print_error "Requirements file not found: $REQUIREMENTS_FILE"
    exit 1
fi

# Copy requirements.txt to build directory
cp "$REQUIREMENTS_FILE" "$BUILD_DIR/"
print_status "Requirements file copied"

# Check if custom Dockerfile exists
read -p "Do you have a custom Dockerfile? (y/n): " HAS_DOCKERFILE
if [[ "$HAS_DOCKERFILE" =~ ^[Yy]$ ]]; then
    read -p "Enter the path to your Dockerfile: " DOCKERFILE_PATH
    if [[ ! -f "$DOCKERFILE_PATH" ]]; then
        print_error "Dockerfile not found: $DOCKERFILE_PATH"
        exit 1
    fi
    cp "$DOCKERFILE_PATH" "$BUILD_DIR/"
    print_status "Custom Dockerfile copied"
else
    # Create default Dockerfile
    print_status "Creating default Dockerfile..."
    cat > "$BUILD_DIR/Dockerfile" << EOF
# Use full Python image for better package compatibility
FROM python:3.9

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies for common packages
RUN apt-get update && apt-get install -y \\
    gcc \\
    g++ \\
    build-essential \\
    libffi-dev \\
    libssl-dev \\
    libxml2-dev \\
    libxslt1-dev \\
    zlib1g-dev \\
    libjpeg-dev \\
    libpng-dev \\
    libfreetype6-dev \\
    pkg-config \\
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Upgrade pip and install dependencies
RUN pip install --no-cache-dir --upgrade pip wheel setuptools
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY $APP_FILENAME .

# Expose port
EXPOSE 8080

# Run the application
CMD ["python", "$APP_FILENAME"]
EOF
    print_status "Default Dockerfile created"
fi

echo ""
echo -e "${BLUE}Step 2: Build Docker image${NC}"

# Prompt for image name
read -p "Enter a name for your Docker image (e.g., my-data-app): " IMAGE_NAME
if [[ -z "$IMAGE_NAME" ]]; then
    IMAGE_NAME="data-deployer-app"
    print_warning "Using default image name: $IMAGE_NAME"
fi

# Add timestamp tag
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FULL_IMAGE_NAME="$IMAGE_NAME:$TIMESTAMP"

print_status "Building Docker image: $FULL_IMAGE_NAME"

# Build the Docker image
cd "$BUILD_DIR"
if docker build -t "$FULL_IMAGE_NAME" .; then
    print_status "Docker image built successfully!"
else
    print_error "Docker build failed!"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Save Docker image as tar file${NC}"

# Create exports directory
EXPORTS_DIR="$SCRIPT_DIR/docker-exports"
mkdir -p "$EXPORTS_DIR"

# Save the image as tar file
TAR_FILENAME="$IMAGE_NAME-$TIMESTAMP.tar"
TAR_PATH="$EXPORTS_DIR/$TAR_FILENAME"

print_status "Saving Docker image to: $TAR_PATH"

if docker save "$FULL_IMAGE_NAME" -o "$TAR_PATH"; then
    print_status "Docker image saved successfully!"
    
    # Get file size
    FILE_SIZE=$(ls -lh "$TAR_PATH" | awk '{print $5}')
    print_status "File size: $FILE_SIZE"
else
    print_error "Failed to save Docker image!"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Build Complete! ===${NC}"
echo ""
echo -e "${BLUE}Your Docker image has been built and saved as:${NC}"
echo -e "  📁 File: ${GREEN}$TAR_PATH${NC}"
echo -e "  🏷️  Image: ${GREEN}$FULL_IMAGE_NAME${NC}"
echo -e "  📦 Size: ${GREEN}$FILE_SIZE${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Upload the tar file ($TAR_FILENAME) in the Data Deployer web interface"
echo "2. Use '$FULL_IMAGE_NAME' as the image name during deployment"
echo "3. The deployment will load and push your image to AWS ECR"
echo ""
echo -e "${YELLOW}Note: Keep the tar file safe - you'll need it for deployment!${NC}"

# Clean up build directory (optional)
read -p "Clean up build directory? (y/n): " CLEANUP
if [[ "$CLEANUP" =~ ^[Yy]$ ]]; then
    rm -rf "$BUILD_DIR"
    print_status "Build directory cleaned up"
fi

echo ""
print_status "Build script completed successfully!"
