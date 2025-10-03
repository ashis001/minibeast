# Local Docker Build & Deployment Guide

This guide explains how to build Docker images locally on your Mac and deploy them using the Data Deployer application.

## Overview

The Data Deployer now supports **local Docker image building** instead of cloud-based building. This approach:

- ✅ **Faster builds** - No cloud build time
- ✅ **Better control** - Build and test locally first
- ✅ **Offline capable** - Build without internet
- ✅ **Cost effective** - No CodeBuild charges
- ✅ **Secure** - Your code stays on your machine during build

## Prerequisites

### Required Software
1. **Docker Desktop** - Install from [docker.com](https://www.docker.com/products/docker-desktop)
2. **Terminal/Command Line** access on your Mac

### Required Files
1. **Python Application** - Your main Python file (e.g., `app.py`, `main.py`)
2. **requirements.txt** - Python dependencies list
3. **Dockerfile** (optional) - Custom Docker configuration

## Step 1: Prepare Your Application

### 1.1 Create Your Python Application
```python
# Example: app.py
import pandas as pd
import boto3
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/process', methods=['POST'])
def process_data():
    # Your data processing logic here
    data = request.get_json()
    # Process the data...
    return jsonify({"result": "processed"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### 1.2 Create requirements.txt
```txt
# Example: requirements.txt
flask==2.3.3
pandas==2.1.4
boto3==1.34.0
snowflake-connector-python==3.4.0
requests==2.31.0
```

**Important Notes:**
- Always specify exact versions (use `==` not `>=`)
- Test your requirements locally first: `pip install -r requirements.txt`
- For Snowflake apps, include compatible versions as shown above

### 1.3 Create Dockerfile (Optional)
```dockerfile
# Example: Custom Dockerfile
FROM python:3.9

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip wheel setuptools
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Expose port
EXPOSE 8080

# Run application
CMD ["python", "app.py"]
```

## Step 2: Build Docker Image Locally

### 2.1 Using the Build Script (Recommended)

The easiest way is to use our provided build script:

```bash
# Navigate to the data-deployer directory
cd /path/to/data-deployer-main

# Run the build script
./build-docker-image.sh
```

The script will:
1. ✅ Check if Docker is installed
2. ✅ Prompt for your application files
3. ✅ Create a Dockerfile if you don't have one
4. ✅ Build the Docker image
5. ✅ Save it as a tar file for deployment
6. ✅ Provide the exact image name to use

### 2.2 Manual Build Process

If you prefer to build manually:

```bash
# 1. Create a build directory
mkdir docker-build
cd docker-build

# 2. Copy your files
cp /path/to/your/app.py .
cp /path/to/your/requirements.txt .
cp /path/to/your/Dockerfile .  # if you have one

# 3. Build the Docker image
docker build -t my-data-app:$(date +%Y%m%d-%H%M%S) .

# 4. Save as tar file
docker save my-data-app:20241201-143022 -o my-data-app-20241201-143022.tar
```

### 2.3 Testing Your Image Locally

Before deployment, test your image:

```bash
# Run your image locally
docker run -p 8080:8080 my-data-app:20241201-143022

# Test the health endpoint
curl http://localhost:8080/health

# Test your main functionality
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Step 3: Deploy Using Data Deployer

### 3.1 Start the Data Deployer Application

```bash
# Start the backend server
cd server
npm install
npm start

# Start the frontend (in another terminal)
cd ..
npm install
npm run dev
```

### 3.2 Configure AWS Credentials

1. Open the Data Deployer web interface
2. Go to **Configuration** step
3. Enter your AWS credentials:
   - Access Key ID
   - Secret Access Key
   - Region (e.g., `us-east-1`)
4. Click **Test Connection**
5. Use **Setup Permissions** if needed

### 3.3 Upload and Deploy

1. Go to **Docker Image Deployment** step
2. **Upload Docker Image**:
   - Drag and drop your `.tar` file, OR
   - Click "Choose Files" and select your `.tar` file
3. **Enter Image Name**:
   - Use the exact name from build script output
   - Example: `my-data-app:20241201-143022`
4. **Configure Environment Variables**:
   - Add any required environment variables
   - Example: `API_KEY=your-secret-key`
5. Click **Start Deployment**

### 3.4 Monitor Deployment Progress

The deployment process includes:

1. ✅ **ECR Repository** - Creates AWS container registry
2. ✅ **Docker Load** - Loads your image on the server
3. ✅ **ECR Push** - Pushes image to AWS
4. ✅ **Task Definition** - Creates ECS task configuration
5. ✅ **ECS Service** - Sets up container orchestration
6. ✅ **Step Functions** - Creates workflow automation
7. ✅ **API Gateway** - Creates REST API endpoint
8. ✅ **Final Setup** - Completes deployment

## Step 4: Use Your Deployed API

After successful deployment, you'll receive:

- **API Endpoint URL**: `https://xyz.execute-api.region.amazonaws.com/prod/start-validator`
- **CloudWatch Logs**: Monitor your application logs
- **ECS Service**: Manage your running containers

### Example API Usage

```bash
# Call your deployed API
curl -X POST https://xyz.execute-api.us-east-1.amazonaws.com/prod/start-validator \
  -H "Content-Type: application/json" \
  -d '{"input": "your-data"}'
```

## Troubleshooting

### Common Issues

#### Docker Build Fails
```bash
# Check Docker is running
docker --version

# Check Dockerfile syntax
docker build --no-cache -t test-image .

# Check requirements.txt
pip install -r requirements.txt
```

#### Image Too Large
```bash
# Check image size
docker images my-data-app:latest

# Optimize Dockerfile:
# - Use smaller base image (python:3.9-slim)
# - Remove unnecessary packages
# - Use multi-stage builds
```

#### Upload Fails
- Ensure file is `.tar` format
- Check file size < 2GB
- Verify internet connection

#### Deployment Fails
- Check AWS credentials and permissions
- Verify Docker is installed on deployment server
- Check CloudWatch logs for detailed errors

### Getting Help

1. **Check Logs**: Look at the deployment step logs in the web interface
2. **CloudWatch**: Check AWS CloudWatch logs for runtime errors
3. **Docker Logs**: Use `docker logs <container-id>` for local testing
4. **AWS Console**: Check ECS, ECR, and API Gateway in AWS console

## Best Practices

### Security
- ✅ Never hardcode secrets in your code
- ✅ Use environment variables for sensitive data
- ✅ Keep your Docker images updated
- ✅ Use specific version tags, not `latest`

### Performance
- ✅ Optimize your Dockerfile for smaller images
- ✅ Use `.dockerignore` to exclude unnecessary files
- ✅ Test locally before deploying
- ✅ Monitor resource usage in AWS

### Maintenance
- ✅ Keep track of your image versions
- ✅ Clean up old Docker images: `docker system prune`
- ✅ Update dependencies regularly
- ✅ Monitor AWS costs and usage

## Example Project Structure

```
my-data-project/
├── app.py                 # Your main application
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker configuration (optional)
├── .dockerignore         # Files to exclude from build
├── test_app.py           # Unit tests
└── README.md             # Project documentation
```

## Summary

The new local Docker build process gives you:

1. **Full Control** - Build and test locally first
2. **Faster Deployment** - No cloud build waiting time
3. **Better Debugging** - See build issues immediately
4. **Cost Savings** - No CodeBuild charges
5. **Offline Development** - Build without internet

Follow this guide to successfully build and deploy your applications using the Data Deployer's new local Docker workflow!
