# Data Deployer - Local Docker Build & AWS ECS Deployment Platform

A powerful deployment platform that enables seamless deployment of locally-built Docker images to AWS ECS with full control over the build process.

## 🚀 Key Features

### **Local Docker Build Architecture**
- ✅ **Local Docker Building** - Build and test images on your Mac before deployment
- ✅ **Full Build Control** - Complete control over Docker build process and dependencies
- ✅ **Real AWS ECS Deployment** - Deploys to production-ready ECS Fargate services
- ✅ **Configuration Persistence** - Saves AWS/Snowflake credentials after successful tests
- ✅ **Smart Retry Mechanism** - Retry failed deployment steps with one click
- ✅ **Live Logs Interface** - Expandable/collapsible logs like software installers
- ✅ **Auto-Permission Setup** - One-click AWS permission configuration
- ✅ **Real-time Progress Tracking** - Live deployment status updates

### **Supported Services**
- **Local Docker** - Build images locally on your Mac
- **AWS ECS** - Container orchestration
- **AWS ECR** - Container registry
- **AWS Step Functions** - Workflow orchestration
- **AWS API Gateway** - REST API endpoints
- **Snowflake** - Data warehouse integration
- **CloudWatch** - Logging and monitoring

## 🏗️ Architecture

### **New Local Build & Deploy Flow**
1. **Local Build** - Use provided script to build Docker images locally
2. **Permission Setup** - One-click AWS permission configuration (optional)
3. **Configuration** - Test and save AWS/Snowflake credentials
4. **Image Upload** - Upload pre-built Docker image tar file
5. **Docker Load** - Load image on deployment server
6. **ECR Push** - Push image to Elastic Container Registry
7. **ECS Deploy** - Fargate service deployed with auto-scaling
8. **Step Functions** - Workflow orchestration for task execution
9. **API Gateway** - REST API endpoint for triggering workflows
10. **Live Monitoring** - Real-time logs and status updates

### **Technology Stack**
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + AWS SDK
- **Cloud**: AWS (ECS, ECR, CodeBuild, S3, Step Functions, API Gateway, IAM, VPC)
- **Database**: Snowflake integration

## 🛠️ Setup Instructions

### **Prerequisites**
- **Docker Desktop** - Install from [docker.com](https://www.docker.com/products/docker-desktop)
- **Node.js 16+** and npm
- **AWS Account** with appropriate permissions
- **Snowflake account** (optional)

### **Quick Start**
```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd data-deployer-main

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd server
npm install

# 4. Start the backend server
npm start
# Server runs on http://localhost:3002

# 5. In a new terminal, start the frontend
cd ..
npm run dev
# Frontend runs on http://localhost:5173
```

### **AWS Permissions Required**
Your AWS user needs the following permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:*",
                "ecs:*",
                "codebuild:*",
                "s3:*",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:GetRole",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:CreateSecurityGroup",
                "ec2:AuthorizeSecurityGroupIngress",
                "logs:CreateLogGroup"
            ],
            "Resource": "*"
        }
    ]
}
```

### **IAM Role Setup (If No Permissions)**
If you don't have IAM role creation permissions, run:
```bash
cd server
node setup-iam-roles.js
```

## 📖 Usage Guide

### **Step 1: Configuration**
1. Open the application at `http://localhost:8082`
2. **Optional**: Use the **AWS Permissions Setup** section to automatically configure required permissions
   - Enter your AWS credentials and IAM username
   - Click **Setup Permissions** to create the `DataDeployerFullAccess` policy
3. Navigate to **AWS Configuration** tab
4. Enter your AWS Access Key, Secret Key, and Region
5. Click **Test AWS Connection** - configuration saves automatically on success
6. Switch to **Snowflake Configuration** tab (optional)
7. Enter Snowflake credentials and test connection
8. Click **Continue to Deployment** when both tests pass

### **Step 2: Build Docker Image Locally**
1. **Use the build script** (recommended):
   ```bash
   ./build-docker-image.sh
   ```
   - Follow the prompts to select your Python app and requirements.txt
   - The script will build and save your Docker image as a tar file
   - Note the image name provided in the output

2. **Manual build** (alternative):
   ```bash
   # Create build directory and copy files
   mkdir docker-build && cd docker-build
   cp /path/to/your/app.py .
   cp /path/to/your/requirements.txt .
   
   # Build Docker image
   docker build -t my-app:$(date +%Y%m%d-%H%M%S) .
   
   # Save as tar file
   docker save my-app:20241201-143022 -o my-app.tar
   ```

3. **Test locally** (recommended):
   ```bash
   docker run -p 8080:8080 my-app:20241201-143022
   curl http://localhost:8080/health
   ```

### **Step 3: Upload and Deploy**
1. **Upload Docker Image**:
   - Drag and drop your `.tar` file or click "Choose Files"
   - Enter the exact image name from build output
2. **Configure Environment Variables** for your application
3. Click **Start Deployment**

### **Step 4: Monitor Deployment**
1. Watch real-time progress as your app deploys:
   - ✅ ECR Repository Creation
   - ✅ Docker Image Loading
   - ✅ Image Push to ECR
   - ✅ ECS Task Definition
   - ✅ ECS Service Deployment
   - ✅ Step Functions Workflow
   - ✅ API Gateway Setup
   - ✅ Final Configuration
2. **Click "Logs" button** to expand/collapse live logs for each step
3. **View real-time terminal output** with timestamps and status indicators
4. If any step fails, click the **Retry** button next to it
5. Get your production API Gateway endpoint when complete

### **Key Features in Action**

#### **Configuration Persistence**
- ✅ Credentials automatically saved after successful test
- ✅ Auto-loaded on page refresh
- ✅ Click "Edit" button to modify saved configurations

#### **Smart Retry System**
- ✅ Retry buttons appear on failed deployment steps
- ✅ Automatically resumes from the failed step
- ✅ No need to restart entire deployment

#### **Live Logging Interface**
- ✅ Expandable/collapsible log sections like software installers
- ✅ Terminal-style interface with timestamps
- ✅ Real-time log streaming with visual indicators
- ✅ Auto-collapse completed steps, keep failed steps expanded

#### **Auto-Permission Management**
- ✅ One-click AWS permission setup through the app
- ✅ Automatic policy creation and attachment
- ✅ No manual AWS console configuration required
- ✅ Comprehensive permission coverage for all services

#### **Real-time Updates**
- ✅ Live progress tracking
- ✅ Step-by-step status updates
- ✅ Detailed error messages with solutions

## 🧪 Test Files

Sample files are provided in `/test-files/`:
- `sample-app.py` - Simple HTTP server with validation endpoints
- `requirements.txt` - No external dependencies required
- `Dockerfile` - Production-ready container configuration

## 🔧 Troubleshooting

### **Common Issues**

**"Could not connect to server"**
- Ensure backend server is running on port 3002
- Check if port is available: `lsof -i :3002`

**"AccessDenied: User is not authorized"**
- Add required AWS permissions (see setup section)
- Or run the IAM role setup script

**"Docker daemon not running"**
- This shouldn't happen! The system uses cloud-based building
- If you see this error, there's a configuration issue

### **Getting Help**
1. Check server logs for detailed error messages
2. Verify AWS credentials have required permissions
3. Ensure all dependencies are installed correctly

## 🚀 Production Deployment

The deployed applications create a complete production infrastructure:
- **AWS ECS Fargate** - Serverless containers with auto-scaling
- **Step Functions** - Workflow orchestration for reliable task execution
- **API Gateway** - Production REST API endpoints with proper routing
- **CloudWatch Logging** - Full observability and monitoring
- **Security Groups & VPC** - Proper network isolation and security
- **IAM Roles** - Least-privilege access with comprehensive policies

### **Final Output**
After successful deployment, you receive:
- **API Gateway URL**: `https://[api-id].execute-api.[region].amazonaws.com/prod/start-validator`
- **Step Functions ARN**: For direct workflow invocation
- **ECS Service**: Running containerized application
- **CloudWatch Logs**: Real-time application monitoring

## 📝 License

This project is built with modern web technologies and cloud-native architecture for scalable, production-ready deployments.
