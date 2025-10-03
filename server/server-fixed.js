const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configure file storage for uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const app = express();
const port = 3002;

// Store deployment status and configurations
const deploymentStatus = new Map();
const deploymentConfigs = new Map();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test AWS Connection
app.post('/api/test-aws', (req, res) => {
  const { accessKey, secretKey, region } = req.body;
  
  if (!accessKey || !secretKey || !region) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing AWS credentials.' 
    });
  }

  // Test AWS connection
  const ec2 = new AWS.EC2({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: region
  });

  ec2.describeInstances({}, (err) => {
    if (err) {
      console.error('AWS Connection Error:', err);
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to connect to AWS. Please check your credentials and region.'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Successfully connected to AWS.'
    });
  });
});

// Setup AWS permissions
app.post('/api/setup-permissions', async (req, res) => {
  const { accessKey, secretKey, region, userName } = req.body;

  if (!accessKey || !secretKey || !region || !userName) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: accessKey, secretKey, region, userName' 
    });
  }

  try {
    const iam = new AWS.IAM({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region,
    });

    const policyName = 'DataDeployerFullAccess';
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'events:*',
            'states:*',
            'apigateway:*',
            'iam:CreateRole',
            'iam:AttachRolePolicy',
            'iam:CreatePolicy',
            'iam:GetRole',
            'iam:PassRole',
            'ecr:*',
            'ecs:*',
            'codebuild:*',
            's3:*',
            'logs:*',
            'ec2:DescribeVpcs',
            'ec2:DescribeSubnets',
            'ec2:CreateSecurityGroup',
            'ec2:AuthorizeSecurityGroupIngress',
            'ec2:DescribeSecurityGroups',
            'ec2:DescribeNetworkInterfaces'
          ],
          Resource: '*'
        }
      ]
    };

    // Create the policy
    let policyArn;
    try {
      const createPolicyResult = await iam.createPolicy({
        PolicyName: policyName,
        PolicyDocument: JSON.stringify(policyDocument),
        Description: 'Full access policy for Data Deployer application'
      }).promise();
      policyArn = createPolicyResult.Policy.Arn;
    } catch (error) {
      if (error.code === 'EntityAlreadyExistsException') {
        // Get existing policy ARN
        const accountId = await iam.getUser().then(result => result.User.Arn.split(':')[4]);
        policyArn = `arn:aws:iam::${accountId}:policy/${policyName}`;
      } else {
        throw error;
      }
    }

    // Attach policy to user
    await iam.attachUserPolicy({
      UserName: userName,
      PolicyArn: policyArn
    }).promise();

    res.json({
      success: true,
      message: 'Permissions setup completed successfully!',
      policyArn: policyArn,
      policyName: policyName
    });

  } catch (error) {
    console.error('Permission setup failed:', error);
    res.status(400).json({
      success: false,
      message: `Permission setup failed: ${error.message}`,
      errorCode: error.code
    });
  }
});

// Test Snowflake Connection
app.post('/api/test-snowflake', (req, res) => {
  const { account, username, password, database, schema, warehouse } = req.body;
  
  if (!account || !username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required Snowflake credentials.'
    });
  }

  // Simple validation - in a real app, you would actually connect to Snowflake
  setTimeout(() => {
    res.json({ 
      success: true, 
      message: 'Successfully connected to Snowflake.'
    });
  }, 1000);
});

// Get deployment status
app.get('/api/deployment/:id/status', (req, res) => {
  const deploymentId = req.params.id;
  const status = deploymentStatus.get(deploymentId);
  
  if (!status) {
    return res.status(404).json({ 
      success: false, 
      message: 'Deployment not found.'
    });
  }
  
  res.json({ 
    success: true, 
    status: status
  });
});

// Retry deployment endpoint
app.post('/api/deployment/:id/retry', (req, res) => {
  const deploymentId = req.params.id;
  const status = deploymentStatus.get(deploymentId);
  
  if (!status) {
    return res.status(404).json({ 
      success: false, 
      message: 'Deployment not found.'
    });
  }
  
  if (status.status !== 'failed') {
    return res.status(400).json({ 
      success: false, 
      message: 'Deployment is not in failed state.'
    });
  }
  
  // Reset deployment status for retry
  status.status = 'pending';
  status.steps = [
    { id: '1', name: 'Initializing', status: 'in-progress', details: 'Retrying deployment...' },
    { id: '2', name: 'Uploading Files', status: 'pending' },
    { id: '3', name: 'Configuring AWS', status: 'pending' },
    { id: '4', name: 'Deploying', status: 'pending' },
    { id: '5', name: 'Verifying', status: 'pending' }
  ];
  status.updatedAt = new Date().toISOString();
  
  deploymentStatus.set(deploymentId, status);
  
  // Restart the simulation
  simulateDeployment(deploymentId);
  
  res.json({ 
    success: true, 
    message: 'Deployment retry initiated.'
  });
});

// Start deployment
app.post('/api/deploy', upload.array('files'), (req, res) => {
  const { config } = req.body;
  const files = req.files;
  const deploymentId = crypto.randomUUID();
  
  console.log('🚀 Web-based deployment initiated (no local Docker required)');
  console.log('Files received:', files ? files.length : 0);
  
  // Store deployment status
  const status = {
    id: deploymentId,
    status: 'pending',
    steps: [
      { id: '1', name: 'Initializing', status: 'in-progress', details: 'Starting cloud-native deployment...' },
      { id: '2', name: 'Processing Files', status: 'pending', details: 'Preparing Docker image for cloud build' },
      { id: '3', name: 'Building Image', status: 'pending', details: 'Using AWS CodeBuild to build Docker image' },
      { id: '4', name: 'Deploying to ECS', status: 'pending', details: 'Deploying containerized application' },
      { id: '5', name: 'Finalizing', status: 'pending', details: 'Setting up API endpoints and monitoring' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  deploymentStatus.set(deploymentId, status);
  deploymentConfigs.set(deploymentId, { config, files });
  
  // Simulate deployment in the background
  simulateDeployment(deploymentId);
  
  res.json({ 
    success: true, 
    deploymentId,
    message: 'Deployment started successfully.'
  });
});

// Simulate deployment progress
function simulateDeployment(deploymentId) {
  const status = deploymentStatus.get(deploymentId);
  if (!status) return;
  
  let step = 0;
  const steps = [
    { name: 'Processing Files', status: 'in-progress', details: 'Extracting pre-built Docker image from tar file...' },
    { name: 'Processing Files', status: 'completed', details: 'Docker image extracted successfully - no rebuild needed!' },
    { name: 'Building Image', status: 'in-progress', details: 'Tagging and pushing pre-built image to ECR...' },
    { name: 'Building Image', status: 'completed', details: 'Pre-built Docker image pushed to ECR successfully.' },
    { name: 'Deploying to ECS', status: 'in-progress', details: 'Creating ECS task definition and service...' },
    { name: 'Deploying to ECS', status: 'completed', details: 'Application deployed to ECS cluster using your image.' },
    { name: 'Finalizing', status: 'in-progress', details: 'Setting up API Gateway and final configurations...' },
    { name: 'Finalizing', status: 'completed', details: 'Deployment completed! Your pre-built image is now live! 🚀' }
  ];
  
  const interval = setInterval(() => {
    if (step >= steps.length) {
      clearInterval(interval);
      return;
    }
    
    const currentStep = steps[step];
    const stepIndex = status.steps.findIndex(s => s.name === currentStep.name);
    
    if (stepIndex !== -1) {
      status.steps[stepIndex] = {
        ...status.steps[stepIndex],
        status: currentStep.status,
        details: currentStep.details
      };
    } else {
      status.steps.push({
        id: (status.steps.length + 1).toString(),
        name: currentStep.name,
        status: currentStep.status,
        details: currentStep.details
      });
    }
    
    status.updatedAt = new Date().toISOString();
    
    if (step === steps.length - 1) {
      status.status = 'completed';
    }
    
    deploymentStatus.set(deploymentId, status);
    step++;
  }, 2000);
}

// Start the server
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
