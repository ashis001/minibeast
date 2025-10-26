require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const snowflake = require('snowflake-sdk');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');
const { validateToken, requirePermission, optionalAuth } = require('./middleware/auth');
const checkOrgStatus = require('./middleware/checkOrgStatus');

// Configure file storage for Docker image uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit for Docker images
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

// Create required IAM policy for deployment
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

app.post('/api/test-aws', async (req, res) => {
  const { accessKey, secretKey, region } = req.body;

  if (!accessKey || !secretKey || !region) {
    return res.status(400).json({ success: false, message: 'Missing AWS credentials.' });
  }

  // Validate credential format
  if (!accessKey.startsWith('AKIA') && !accessKey.startsWith('ASIA')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid Access Key format. AWS Access Keys should start with AKIA or ASIA.' 
    });
  }

  if (secretKey.length < 20) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid Secret Key format. AWS Secret Keys should be at least 20 characters long.' 
    });
  }

  try {
    console.log(`Testing AWS credentials for region: ${region}`);
    
    const sts = new AWS.STS({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region,
    });

    const identity = await sts.getCallerIdentity().promise();
    console.log(`AWS credentials valid. Account: ${identity.Account}, User: ${identity.Arn}`);
    
    // Test ECR access
    const ecr = new AWS.ECR({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region,
    });
    await ecr.describeRepositories({ maxResults: 1 }).promise();
    
    res.json({ 
      success: true, 
      message: `AWS connection successful! Account: ${identity.Account}`,
      accountId: identity.Account
    });
  } catch (error) {
    console.error('AWS connection test failed:', error);
    
    let errorMessage = error.message;
    if (error.code === 'UnrecognizedClientException') {
      errorMessage = 'Invalid AWS credentials. Please check your Access Key and Secret Key.';
    } else if (error.code === 'InvalidUserID.NotFound') {
      errorMessage = 'AWS credentials are invalid or expired.';
    } else if (error.code === 'AccessDenied') {
      errorMessage = `Access denied. Please ensure your AWS user has ECR and ECS permissions.`;
    }
    
    res.status(400).json({ 
      success: false, 
      message: errorMessage,
      errorCode: error.code
    });
  }
});

// Fetch AWS resources endpoint
app.post('/api/aws-resources', async (req, res) => {
  const { accessKey, secretKey, region } = req.body;

  if (!accessKey || !secretKey || !region) {
    return res.status(400).json({ success: false, message: 'Missing AWS credentials.' });
  }

  try {
    console.log(`Fetching AWS resources for region: ${region}`);
    
    // Configure AWS SDK
    const awsConfig = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region,
    };

    const ecr = new AWS.ECR(awsConfig);
    const ecs = new AWS.ECS(awsConfig);
    const iam = new AWS.IAM(awsConfig);
    const stepfunctions = new AWS.StepFunctions(awsConfig);
    const apigateway = new AWS.APIGateway(awsConfig);

    const resources = {
      clusters: [],
      taskDefinitions: [],
      ecrRepositories: [],
      iamRoles: [],
      stepFunctions: [],
      apiGateways: []
    };

    // Fetch ECS Clusters
    try {
      const clustersResult = await ecs.listClusters().promise();
      if (clustersResult.clusterArns && clustersResult.clusterArns.length > 0) {
        const clusterDetails = await ecs.describeClusters({ 
          clusters: clustersResult.clusterArns 
        }).promise();
        resources.clusters = clusterDetails.clusters
          .filter(cluster => cluster.status === 'ACTIVE')
          .map(cluster => cluster.clusterName);
      }
    } catch (error) {
      console.log('Error fetching ECS clusters:', error.message);
    }

    // Fetch Task Definition Families
    try {
      const taskDefsResult = await ecs.listTaskDefinitionFamilies({ 
        status: 'ACTIVE',
        maxResults: 100 
      }).promise();
      resources.taskDefinitions = taskDefsResult.families || [];
    } catch (error) {
      console.log('Error fetching task definitions:', error.message);
    }

    // Fetch ECR Repositories
    try {
      const reposResult = await ecr.describeRepositories({ maxResults: 100 }).promise();
      resources.ecrRepositories = reposResult.repositories.map(repo => repo.repositoryName);
    } catch (error) {
      console.log('Error fetching ECR repositories:', error.message);
    }

    // Fetch IAM Roles (show all roles - let user choose)
    try {
      const rolesResult = await iam.listRoles({ MaxItems: 1000 }).promise();
      resources.iamRoles = rolesResult.Roles
        .map(role => role.RoleName)
        .sort(); // Sort alphabetically for easier selection
    } catch (error) {
      console.log('Error fetching IAM roles:', error.message);
    }

    // Fetch Step Functions
    try {
      const stepFunctionsResult = await stepfunctions.listStateMachines({ maxResults: 100 }).promise();
      resources.stepFunctions = stepFunctionsResult.stateMachines.map(sm => sm.name);
    } catch (error) {
      console.log('Error fetching Step Functions:', error.message);
    }

    // Fetch API Gateways
    try {
      const apiGatewaysResult = await apigateway.getRestApis({ limit: 100 }).promise();
      resources.apiGateways = apiGatewaysResult.items.map(api => api.name);
    } catch (error) {
      console.log('Error fetching API Gateways:', error.message);
    }

    console.log('Fetched AWS resources:', {
      clusters: resources.clusters.length,
      taskDefinitions: resources.taskDefinitions.length,
      ecrRepositories: resources.ecrRepositories.length,
      iamRoles: resources.iamRoles.length,
      stepFunctions: resources.stepFunctions.length,
      apiGateways: resources.apiGateways.length
    });

    res.json({ 
      success: true, 
      message: 'AWS resources fetched successfully',
      resources: resources
    });
  } catch (error) {
    console.error('AWS resources fetch failed:', error);
    
    let errorMessage = error.message;
    if (error.code === 'UnrecognizedClientException') {
      errorMessage = 'Invalid AWS credentials. Please check your Access Key and Secret Key.';
    } else if (error.code === 'AccessDenied') {
      errorMessage = 'Access denied. Please ensure your AWS user has the required permissions.';
    }
    
    res.status(400).json({ 
      success: false, 
      message: errorMessage,
      errorCode: error.code
    });
  }
});

app.post('/api/test-snowflake', (req, res) => {
  const { account, username, password, database, schema, warehouse, role } = req.body;

  if (!account || !username || !password) {
    return res.status(400).json({ success: false, message: 'Missing Snowflake credentials.' });
  }

  const connection = snowflake.createConnection({
    account: account,
    username: username,
    password: password,
  });

  connection.connect((err, conn) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    
    // Save config immediately after successful test to deployments folder (in Docker volume)
    try {
      const deploymentsDir = path.join(__dirname, 'deployments');
      const configPath = path.join(deploymentsDir, 'snowflake-config.json');
      
      // Create deployments directory if it doesn't exist
      if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
      }
      
      // Save full Snowflake config
      const configData = {
        account,
        username,
        password,
        database: database || '',
        schema: schema || '',
        warehouse: warehouse || '',
        role: role || '',
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
      console.log('✅ Snowflake config saved to deployments folder (persisted in Docker volume)');
    } catch (saveError) {
      console.error('Error saving Snowflake config:', saveError.message);
      // Don't fail the response if save fails
    }
    
    res.json({ success: true, message: 'Snowflake connection successful.' });
    conn.destroy(); // Close the connection
  });
});

app.post('/api/deploy', upload.single('dockerImage'), async (req, res) => {
  try {
    const { imageName, envVariables, awsConfig, deploymentConfig, tempDeploymentId } = req.body;
    const dockerFile = req.file;

    // Generate deployment ID on backend
    const deploymentId = 'deploy-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    console.log('Deployment ID:', deploymentId);
    console.log('Uploaded Files:', req.file);

  // Parse deployment configuration
  const parsedDeploymentConfig = JSON.parse(deploymentConfig);
  const module = parsedDeploymentConfig.module;
  
  // Generate unique sequence for resource names
  const uniqueSequence = deploymentId.substring(0, 8);
  
  // Auto-generate image name and resource names using minibeat-[module] pattern
  const autoImageName = `minibeat-${module}:latest`;
  console.log('Auto-generated Docker Image Name:', autoImageName);
  const autoGeneratedConfig = {
    clusterName: `minibeat-${module}-cluster-${uniqueSequence}`,
    taskDefinitionFamily: `minibeat-${module}-task-${uniqueSequence}`,
    executionRoleName: `minibeat-${module}-execution-role-${uniqueSequence}`,
    stepFunctionRoleName: `minibeat-${module}-stepfunctions-role-${uniqueSequence}`,
    stepFunctionName: `minibeat-${module}-workflow-${uniqueSequence}`,
    ecrRepositoryName: `minibeat-${module}-repo-${uniqueSequence}`,
    apiGatewayName: `minibeat-${module}-api-${uniqueSequence}`,
    useExisting: false
  };

  // Store deployment configuration for retry functionality
  deploymentConfigs.set(deploymentId, {
    awsConfig: JSON.parse(awsConfig),
    envVariables: JSON.parse(envVariables),
    files: [dockerFile],
    imageName: autoImageName,
    deploymentConfig: parsedDeploymentConfig,
    awsResourceConfig: autoGeneratedConfig
  });

  // Initialize deployment status
  const initialStatus = {
    id: deploymentId,
    status: 'started',
    currentStep: 'ecr-repo',
    steps: {
      'ecr-repo': { status: 'pending', startTime: null },
      'ecr-push': { status: 'pending' },
      'task-definition': { status: 'pending' },
      'ecs-service': { status: 'pending' },
      'step-functions': { status: 'pending' }
    },
    apiEndpoint: null,
    error: null
  };
  
  deploymentStatus.set(deploymentId, initialStatus);
  console.log('Deployment status initialized for ID:', deploymentId);

  // Start deployment process asynchronously
  deployApplication(deploymentId, JSON.parse(awsConfig), JSON.parse(envVariables), [dockerFile], autoImageName, autoGeneratedConfig)
    .catch(error => {
      console.error('Deployment failed:', error);
      const status = deploymentStatus.get(deploymentId);
      if (status) {
        status.status = 'failed';
        status.error = error.message;
        deploymentStatus.set(deploymentId, status);
      }
    });

    res.json({ 
      success: true, 
      message: 'Deployment process initiated.',
      deploymentId: deploymentId
    });
  } catch (error) {
    console.error('Deploy API error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get deployment status endpoint
app.get('/api/deployment/:id/status', (req, res) => {
  const deploymentId = req.params.id;
  const status = deploymentStatus.get(deploymentId);
  
  console.log('Status request for deployment ID:', deploymentId);
  console.log('Available deployments:', Array.from(deploymentStatus.keys()));
  
  if (!status) {
    return res.status(404).json({ success: false, message: 'Deployment not found' });
  }
  
  res.json({ success: true, deployment: status });
});

// Retry deployment endpoint
app.post('/api/deployment/:id/retry', async (req, res) => {
  const deploymentId = req.params.id;
  const status = deploymentStatus.get(deploymentId);
  
  if (!status) {
    return res.status(404).json({ success: false, message: 'Deployment not found' });
  }
  
  if (status.status !== 'failed') {
    return res.status(400).json({ success: false, message: 'Deployment is not in failed state' });
  }
  
  // Reset deployment status for retry
  status.status = 'started';
  status.error = null;
  
  // Find the first failed step and reset from there
  const stepIds = Object.keys(status.steps);
  let retryFromIndex = -1;
  
  for (let i = 0; i < stepIds.length; i++) {
    if (status.steps[stepIds[i]].status === 'error') {
      retryFromIndex = i;
      break;
    }
  }
  
  if (retryFromIndex !== -1) {
    // Reset all steps from the failed step onwards
    for (let i = retryFromIndex; i < stepIds.length; i++) {
      status.steps[stepIds[i]].status = 'pending';
      delete status.steps[stepIds[i]].startTime;
      delete status.steps[stepIds[i]].endTime;
    }
    
    // Set the first failed step to running
    status.steps[stepIds[retryFromIndex]].status = 'running';
    status.steps[stepIds[retryFromIndex]].startTime = Date.now();
    status.currentStep = stepIds[retryFromIndex];
  }
  
  deploymentStatus.set(deploymentId, status);
  
  // Get the original deployment configuration to restart the real deployment
  const originalDeployment = deploymentConfigs.get(deploymentId);
  if (originalDeployment) {
    // Restart the actual deployment process from the failed step
    deployApplication(deploymentId, originalDeployment.awsConfig, originalDeployment.envVariables, originalDeployment.files, originalDeployment.imageName, originalDeployment.awsResourceConfig)
      .catch(error => {
        console.error('Retry deployment failed:', error);
        const retryStatus = deploymentStatus.get(deploymentId);
        if (retryStatus) {
          retryStatus.status = 'failed';
          retryStatus.error = error.message;
          deploymentStatus.set(deploymentId, retryStatus);
        }
      });
  } else {
    // If we don't have the original config, we can't retry properly
    status.status = 'failed';
    status.error = 'Cannot retry: Original deployment configuration not found';
    deploymentStatus.set(deploymentId, status);
  }
  
  res.json({ success: true, message: 'Deployment retry initiated' });
});

// Check for existing deployments by module
app.get('/api/deployments/check/:module', async (req, res) => {
  try {
    const { module } = req.params;
    
    // Check if there are any completed deployments for this module
    const existingDeployments = [];
    
    for (const [deploymentId, status] of deploymentStatus.entries()) {
      const config = deploymentConfigs.get(deploymentId);
      if (config && config.deploymentConfig && config.deploymentConfig.module === module && status.status === 'completed') {
        existingDeployments.push({
          deploymentId,
          module,
          apiEndpoint: status.apiEndpoint,
          completedAt: status.completedAt || new Date().toISOString(),
          imageName: config.imageName || `minibeat-${module}:latest`
        });
      }
    }
    
    res.json({
      success: true,
      hasExistingDeployments: existingDeployments.length > 0,
      deployments: existingDeployments
    });
  } catch (error) {
    console.error('Error checking existing deployments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check existing deployments'
    });
  }
});

// Snowflake API endpoints for validation configuration

// Helper function to create Snowflake connection
function createSnowflakeConnection(config) {
  return snowflake.createConnection({
    account: config.account,
    username: config.username,
    password: config.password,
    warehouse: config.warehouse,
    database: config.database,
    schema: config.schema,
    role: config.role || 'PUBLIC'
  });
}

// Helper function to execute Snowflake query
function executeSnowflakeQuery(connection, query) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    });
  });
}

app.post('/api/snowflake/tables', async (req, res) => {
  let connection;
  try {
    const { account, username, password, database, schema, warehouse, role } = req.body;
    
    console.log(`📊 Connecting to Snowflake: ${database}.${schema}`);
    
    // Create Snowflake connection
    connection = createSnowflakeConnection({
      account, username, password, database, schema, warehouse, role
    });
    
    // Connect to Snowflake
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) {
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    
    console.log('✅ Connected to Snowflake successfully');
    
    // Query to get all tables in the schema
    const query = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = '${schema}' 
      AND TABLE_CATALOG = '${database}'
      ORDER BY TABLE_NAME
    `;
    
    const rows = await executeSnowflakeQuery(connection, query);
    
    // Format the results
    const tables = rows.map(row => ({
      name: row.TABLE_NAME,
      exists: true
    }));
    
    // Check if TBL_VALIDATING_TEST_CASES exists
    const configTableExists = tables.some(table => table.name === 'TBL_VALIDATING_TEST_CASES');
    if (!configTableExists) {
      tables.push({ name: 'TBL_VALIDATING_TEST_CASES', exists: false });
    }
    
    console.log(`✅ Found ${tables.length} tables in ${database}.${schema}`);
    
    res.json({
      success: true,
      tables: tables,
      message: `Found ${tables.length} tables in ${database}.${schema}`
    });
    
  } catch (error) {
    console.error('Error fetching Snowflake tables:', error);
    res.status(500).json({
      success: false,
      message: `Failed to connect to Snowflake: ${error.message}`
    });
  } finally {
    if (connection) {
      connection.destroy();
    }
  }
});

app.post('/api/snowflake/create-config-table', async (req, res) => {
  let connection;
  try {
    const { account, username, password, database, schema, warehouse, role } = req.body;
    
    console.log(`🏗️ Creating config table in ${database}.${schema}`);
    
    // Create Snowflake connection
    connection = createSnowflakeConnection({
      account, username, password, database, schema, warehouse, role
    });
    
    // Connect to Snowflake
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) {
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    
    console.log('✅ Connected to Snowflake for table creation');
    
    // First create sequence if it doesn't exist
    const createSequenceSQL = `
      CREATE SEQUENCE IF NOT EXISTS ${database}.${schema}.VALIDATION_CASES
      START = 1
      INCREMENT = 1
    `;
    
    await executeSnowflakeQuery(connection, createSequenceSQL);
    console.log('✅ Sequence created/verified');
    
    // Create the main table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${database}.${schema}.TBL_VALIDATING_TEST_CASES (
        ID NUMBER(38,0) NOT NULL DEFAULT ${database}.${schema}.VALIDATION_CASES.NEXTVAL,
        VALIDATION_DESCRIPTION VARCHAR(500),
        VALIDATION_QUERY VARCHAR(16777216),
        OPERATOR VARCHAR(10),
        EXPECTED_OUTCOME VARCHAR(100),
        VALIDATED_BY VARCHAR(100),
        ENTITY VARCHAR(200),
        ITERATION VARCHAR(10),
        INSERTED_DATE TIMESTAMP_NTZ(9),
        UPDATED_DATE TIMESTAMP_NTZ(9),
        IS_ACTIVE BOOLEAN,
        TEAM VARCHAR(50),
        METRIC_INDEX NUMBER(38,0) DEFAULT 1,
        PRIMARY KEY (ID)
      )
    `;
    
    await executeSnowflakeQuery(connection, createTableSQL);
    console.log('✅ Table TBL_VALIDATING_TEST_CASES created successfully');
    
    res.json({
      success: true,
      message: 'TBL_VALIDATING_TEST_CASES table created successfully',
      sql: createTableSQL
    });
    
  } catch (error) {
    console.error('Error creating Snowflake config table:', error);
    res.status(500).json({
      success: false,
      message: `Failed to create config table in Snowflake: ${error.message}`
    });
  } finally {
    if (connection) {
      connection.destroy();
    }
  }
});

app.post('/api/snowflake/insert-validation', validateToken, checkOrgStatus, requirePermission('add_validations'), async (req, res) => {
  let connection;
  try {
    const { account, username, password, database, schema, warehouse, role, validationCase } = req.body;
    
    console.log(`📝 Inserting validation case into ${database}.${schema}.TBL_VALIDATING_TEST_CASES`);
    
    // Create Snowflake connection
    connection = createSnowflakeConnection({
      account, username, password, database, schema, warehouse, role
    });
    
    // Connect to Snowflake
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) {
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    
    console.log('✅ Connected to Snowflake for validation insertion');
    
    // Use parameterized query to prevent SQL injection
    const insertSQL = `
      INSERT INTO ${database}.${schema}.TBL_VALIDATING_TEST_CASES (
        VALIDATION_DESCRIPTION,
        VALIDATION_QUERY,
        OPERATOR,
        EXPECTED_OUTCOME,
        VALIDATED_BY,
        ENTITY,
        ITERATION,
        INSERTED_DATE,
        UPDATED_DATE,
        IS_ACTIVE,
        TEAM,
        METRIC_INDEX
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, 
        CURRENT_TIMESTAMP(),
        CURRENT_TIMESTAMP(),
        TRUE,
        ?, ?
      )
    `;
    
    // Execute with parameters to prevent SQL injection
    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: insertSQL,
        binds: [
          validationCase.validation_description,
          validationCase.validation_query,
          validationCase.operator,
          validationCase.expected_outcome,
          validationCase.validated_by,
          validationCase.entity,
          validationCase.iteration,
          validationCase.team,
          validationCase.metric_index
        ],
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      });
    });
    
    console.log('✅ Validation case inserted successfully');
    
    res.json({
      success: true,
      message: 'Validation case inserted successfully',
      validationCase
    });
    
  } catch (error) {
    console.error('Error inserting validation case:', error);
    res.status(500).json({
      success: false,
      message: `Failed to insert validation case into Snowflake: ${error.message}`
    });
  } finally {
    if (connection) {
      connection.destroy();
    }
  }
});

// Essential API endpoints for ViewValidations
app.post('/api/snowflake/entities', async (req, res) => {
  let connection;
  try {
    const { account, username, password, database, schema, warehouse, role } = req.body;
    
    if (!account || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Snowflake credentials'
      });
    }

    connection = snowflake.createConnection({
      account, username, password,
      database: database || 'DEMO_DB',
      schema: schema || 'PUBLIC',
      warehouse: warehouse || 'COMPUTE_WH',
      role: role || 'SYSADMIN'
    });

    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => err ? reject(err) : resolve(conn));
    });

    // First check what tables exist
    const tables = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `SHOW TABLES`,
        complete: (err, stmt, rows) => err ? reject(err) : resolve(rows)
      });
    });
    
    console.log('📋 Available tables:', tables.map(t => t.name));
    
    const rows = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `SELECT DISTINCT ENTITY FROM TBL_VALIDATING_TEST_CASES WHERE ENTITY IS NOT NULL ORDER BY ENTITY`,
        complete: (err, stmt, rows) => err ? reject(err) : resolve(rows)
      });
    });
    
    res.json({
      success: true,
      entities: rows.map(row => row.ENTITY),
      message: `Found ${rows.length} unique entities`
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to fetch entities: ${error.message}` });
  } finally {
    if (connection) connection.destroy();
  }
});

app.post('/api/snowflake/descriptions', async (req, res) => {
  let connection;
  try {
    const { account, username, password, database, schema, warehouse, role, entities } = req.body;
    
    connection = snowflake.createConnection({
      account, username, password,
      database: database || 'DEMO_DB',
      schema: schema || 'PUBLIC',
      warehouse: warehouse || 'COMPUTE_WH',
      role: role || 'SYSADMIN'
    });

    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => err ? reject(err) : resolve(conn));
    });

    const rows = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `SELECT DISTINCT VALIDATION_DESCRIPTION FROM TBL_VALIDATING_TEST_CASES WHERE ENTITY IN (${entities.map(e => `'${e}'`).join(',')}) AND VALIDATION_DESCRIPTION IS NOT NULL ORDER BY VALIDATION_DESCRIPTION`,
        complete: (err, stmt, rows) => err ? reject(err) : resolve(rows)
      });
    });
    
    res.json({
      success: true,
      descriptions: rows.map(row => row.VALIDATION_DESCRIPTION),
      message: `Found ${rows.length} descriptions`
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to fetch descriptions: ${error.message}` });
  } finally {
    if (connection) connection.destroy();
  }
});

app.post('/api/snowflake/validations-filtered', async (req, res) => {
  let connection;
  try {
    const { account, username, password, database, schema, warehouse, role, entities, descriptions } = req.body;
    
    connection = snowflake.createConnection({
      account, username, password,
      database: database || 'DEMO_DB',
      schema: schema || 'PUBLIC',
      warehouse: warehouse || 'COMPUTE_WH',
      role: role || 'SYSADMIN'
    });

    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => err ? reject(err) : resolve(conn));
    });

    const rows = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `SELECT ID, VALIDATION_DESCRIPTION, VALIDATION_QUERY, OPERATOR, EXPECTED_OUTCOME, VALIDATED_BY, ENTITY, ITERATION, IS_ACTIVE, INSERTED_DATE, UPDATED_DATE, TEAM, METRIC_INDEX FROM TBL_VALIDATING_TEST_CASES WHERE ENTITY IN (${entities.map(e => `'${e}'`).join(',')}) AND VALIDATION_DESCRIPTION IN (${descriptions.map(d => `'${d.replace(/'/g, "''")}'`).join(',')}) ORDER BY INSERTED_DATE DESC`,
        complete: (err, stmt, rows) => err ? reject(err) : resolve(rows)
      });
    });
    
    res.json({ success: true, validations: rows, message: `Found ${rows.length} validation rules` });
    
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to fetch validations: ${error.message}` });
  } finally {
    if (connection) connection.destroy();
  }
});

app.post('/api/snowflake/update-validations', validateToken, checkOrgStatus, requirePermission('edit_validations'), async (req, res) => {
  let connection;
  try {
    const { snowflakeConfig, selectedValidationIds } = req.body;
    const { account, username, password, database, schema, warehouse, role } = snowflakeConfig;
    
    connection = snowflake.createConnection({
      account, username, password,
      database: database || 'DEMO_DB',
      schema: schema || 'PUBLIC',
      warehouse: warehouse || 'COMPUTE_WH',
      role: role || 'SYSADMIN'
    });

    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => err ? reject(err) : resolve(conn));
    });

    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `UPDATE TBL_VALIDATING_TEST_CASES SET IS_ACTIVE = FALSE, UPDATED_DATE = CURRENT_TIMESTAMP()`,
        complete: (err, stmt, rows) => err ? reject(err) : resolve(rows)
      });
    });

    if (selectedValidationIds.length > 0) {
      await new Promise((resolve, reject) => {
        connection.execute({
          sqlText: `UPDATE TBL_VALIDATING_TEST_CASES SET IS_ACTIVE = TRUE, UPDATED_DATE = CURRENT_TIMESTAMP() WHERE ID IN (${selectedValidationIds.map(id => `'${id}'`).join(',')})`,
          complete: (err, stmt, rows) => err ? reject(err) : resolve(rows)
        });
      });
    }
    
    res.json({
      success: true,
      message: `Successfully activated ${selectedValidationIds.length} validation rules`,
      activeCount: selectedValidationIds.length
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to update validations: ${error.message}` });
  } finally {
    if (connection) connection.destroy();
  }
});

app.post('/api/snowflake/update-validation', async (req, res) => {
  let connection;
  try {
    console.log('📝 Update validation endpoint called');
    const { snowflakeConfig, validation } = req.body;
    console.log('📋 Validation data:', validation?.ID, validation?.VALIDATION_DESCRIPTION?.substring(0, 50));
    
    if (!snowflakeConfig) {
      console.log('❌ No snowflake config provided');
      return res.status(400).json({ success: false, message: 'Snowflake configuration is required' });
    }
    
    if (!validation || !validation.ID) {
      console.log('❌ No validation data or ID provided');
      return res.status(400).json({ success: false, message: 'Validation data with ID is required' });
    }
    
    const { account, username, password, database, schema, warehouse, role } = snowflakeConfig;
    
    connection = snowflake.createConnection({
      account, username, password,
      database: database || 'DEMO_DB',
      schema: schema || 'PUBLIC',
      warehouse: warehouse || 'COMPUTE_WH',
      role: role || 'SYSADMIN'
    });

    console.log('🔌 Attempting to connect to Snowflake...');
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) {
          console.log('❌ Snowflake connection failed:', err.message);
          reject(err);
        } else {
          console.log('✅ Snowflake connection successful');
          resolve(conn);
        }
      });
    });

    // Update the validation rule
    console.log('📝 Executing update query for ID:', validation.ID);
    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `UPDATE TBL_VALIDATING_TEST_CASES SET 
          VALIDATION_DESCRIPTION = ?,
          VALIDATION_QUERY = ?,
          OPERATOR = ?,
          EXPECTED_OUTCOME = ?,
          VALIDATED_BY = ?,
          ENTITY = ?,
          ITERATION = ?,
          IS_ACTIVE = ?,
          TEAM = ?,
          METRIC_INDEX = ?,
          UPDATED_DATE = CURRENT_TIMESTAMP()
          WHERE ID = ?`,
        binds: [
          validation.VALIDATION_DESCRIPTION,
          validation.VALIDATION_QUERY,
          validation.OPERATOR,
          validation.EXPECTED_OUTCOME,
          validation.VALIDATED_BY,
          validation.ENTITY,
          validation.ITERATION,
          validation.IS_ACTIVE,
          validation.TEAM,
          validation.METRIC_INDEX,
          validation.ID
        ],
        complete: (err, stmt, rows) => {
          if (err) {
            console.log('❌ Query execution failed:', err.message);
            reject(err);
          } else {
            console.log('✅ Query executed successfully, affected rows:', stmt.getNumUpdatedRows());
            resolve(rows);
          }
        }
      });
    });
    
    res.json({
      success: true,
      message: 'Validation rule updated successfully'
    });
    
  } catch (error) {
    console.log('❌ Update validation error:', error.message);
    console.log('📋 Error details:', error);
    res.status(500).json({ success: false, message: `Failed to update validation: ${error.message}` });
  } finally {
    if (connection) connection.destroy();
  }
});

// Check deployment status for a module
app.get('/api/deployment/status/:module', async (req, res) => {
  try {
    const { module } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    const DEPLOYMENTS_DIR = path.join(__dirname, 'deployments');
    const MODULES_DIR = path.join(DEPLOYMENTS_DIR, 'modules');
    const moduleDir = path.join(MODULES_DIR, module);
    const deploymentFile = path.join(moduleDir, 'deployment.json');
    const resourcesFile = path.join(moduleDir, 'aws-resources.json');
    
    if (!fs.existsSync(deploymentFile) || !fs.existsSync(resourcesFile)) {
      return res.json({
        success: true,
        isDeployed: false,
        message: `Module '${module}' is not deployed`
      });
    }
    
    // Load and validate deployment data
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const resourcesData = JSON.parse(fs.readFileSync(resourcesFile, 'utf8'));
    
    // Check if deployment is valid (has required fields)
    const isValid = deploymentData.status === 'completed' && 
                   resourcesData.stepFunctionArn && 
                   resourcesData.ecsCluster &&
                   deploymentData.awsConfig;
    
    if (isValid) {
      console.log(`✅ Found valid deployment for module '${module}':`, resourcesData.stepFunctionArn);
      
      res.json({
        success: true,
        isDeployed: true,
        deploymentData: {
          id: deploymentData.id,
          status: deploymentData.status,
          completedAt: deploymentData.completedAt,
          apiEndpoint: deploymentData.apiEndpoint,
          stepFunctionArn: resourcesData.stepFunctionArn,
          region: resourcesData.region,
          deploymentDate: resourcesData.deploymentDate
        },
        message: `Module '${module}' is already deployed`
      });
    } else {
      // Invalid deployment - remove corrupted files
      try {
        fs.unlinkSync(deploymentFile);
        fs.unlinkSync(resourcesFile);
        console.log(`🗑️ Removed corrupted deployment files for module '${module}'`);
      } catch (error) {
        console.log(`⚠️ Could not remove corrupted files: ${error.message}`);
      }
      
      res.json({
        success: true,
        isDeployed: false,
        message: `Module '${module}' deployment is corrupted and has been reset`
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking deployment status:', error);
    res.status(500).json({
      success: false,
      message: `Failed to check deployment status: ${error.message}`
    });
  }
});

// Load saved deployment details
app.get('/api/deployment/load-resources', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const DEPLOYMENTS_DIR = path.join(__dirname, 'deployments');
    const MODULES_DIR = path.join(DEPLOYMENTS_DIR, 'modules');
    const validatorDir = path.join(MODULES_DIR, 'validator');
    const resourcesFile = path.join(validatorDir, 'aws-resources.json');
    
    if (!fs.existsSync(resourcesFile)) {
      return res.status(404).json({
        success: false,
        message: 'No deployment found. Please deploy the validator module first.'
      });
    }
    
    const savedResources = JSON.parse(fs.readFileSync(resourcesFile, 'utf8'));
    
    console.log('📋 Loaded saved AWS resources:', savedResources.stepFunctionArn);
    
    res.json({
      success: true,
      resources: savedResources,
      message: 'Deployment resources loaded successfully'
    });
    
  } catch (error) {
    console.error('❌ Error loading deployment resources:', error);
    res.status(500).json({
      success: false,
      message: `Failed to load deployment resources: ${error.message}`
    });
  }
});

// Clear deployment for redeployment
app.delete('/api/deployment/clear/:module', async (req, res) => {
  try {
    const { module } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    const DEPLOYMENTS_DIR = path.join(__dirname, 'deployments');
    const MODULES_DIR = path.join(DEPLOYMENTS_DIR, 'modules');
    const moduleDir = path.join(MODULES_DIR, module);
    const deploymentFile = path.join(moduleDir, 'deployment.json');
    const resourcesFile = path.join(moduleDir, 'aws-resources.json');
    
    let filesRemoved = 0;
    
    // Remove deployment files
    if (fs.existsSync(deploymentFile)) {
      fs.unlinkSync(deploymentFile);
      filesRemoved++;
      console.log(`🗑️ Removed deployment.json for module '${module}'`);
    }
    
    if (fs.existsSync(resourcesFile)) {
      fs.unlinkSync(resourcesFile);
      filesRemoved++;
      console.log(`🗑️ Removed aws-resources.json for module '${module}'`);
    }
    
    // Remove from memory
    for (const [deploymentId, deployment] of deploymentStatus.entries()) {
      if (deployment.module === module || deploymentId.includes(module)) {
        deploymentStatus.delete(deploymentId);
        deploymentConfigs.delete(deploymentId);
        console.log(`🗑️ Removed deployment '${deploymentId}' from memory`);
      }
    }
    
    res.json({
      success: true,
      message: `Module '${module}' cleared for redeployment. ${filesRemoved} files removed.`,
      filesRemoved: filesRemoved
    });
    
  } catch (error) {
    console.error('❌ Error clearing deployment:', error);
    res.status(500).json({
      success: false,
      message: `Failed to clear deployment: ${error.message}`
    });
  }
});

// Execute Step Function directly using saved deployment details
app.post('/api/stepfunction/execute', async (req, res) => {
  try {
    console.log('🚀 Executing Step Function from saved deployment...');
    
    const { validationIds } = req.body;
    
    // Load saved AWS resources
    const fs = require('fs');
    const path = require('path');
    
    const DEPLOYMENTS_DIR = path.join(__dirname, 'deployments');
    const MODULES_DIR = path.join(DEPLOYMENTS_DIR, 'modules');
    const validatorDir = path.join(MODULES_DIR, 'validator');
    const resourcesFile = path.join(validatorDir, 'aws-resources.json');
    const deploymentFile = path.join(validatorDir, 'deployment.json');
    
    if (!fs.existsSync(resourcesFile) || !fs.existsSync(deploymentFile)) {
      return res.status(404).json({
        success: false,
        message: 'No deployment found. Please deploy the validator module first.'
      });
    }
    
    const savedResources = JSON.parse(fs.readFileSync(resourcesFile, 'utf8'));
    const deploymentDetails = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Load saved resources to get container name
    // Container name in task definition is the repositoryName (e.g., 'minibeat-validator-repo-deploy-1')
    const taskDefArn = savedResources.taskDefinition;
    const containerName = savedResources.ecrRepository ? savedResources.ecrRepository.split('/').pop().split(':')[0] : 'validator';
    
    // Build dynamic SQL query based on selected validation IDs
    // This ensures we run specific validation rules (entity + description combination)
    let testCaseSQL = "SELECT id, validation_query, expected_outcome, operator, metric_index FROM tbl_validating_test_cases WHERE is_active = TRUE";
    
    if (validationIds && validationIds.length > 0) {
      // Validation IDs are numbers, so convert to string and handle SQL injection
      const idList = validationIds.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      testCaseSQL += ` AND id IN (${idList})`;
    }
    
    console.log('📝 Generated TEST_CASE_SQL:', testCaseSQL);
    console.log('🐞 Container name:', containerName);
    
    // Configure AWS SDK with saved credentials
    const AWS = require('aws-sdk');
    AWS.config.update({
      accessKeyId: deploymentDetails.awsConfig.accessKey,
      secretAccessKey: deploymentDetails.awsConfig.secretKey,
      region: savedResources.region
    });
    
    const stepfunctions = new AWS.StepFunctions();
    const ecs = new AWS.ECS();
    
    // Start Step Function execution with container overrides in ECS format
    const executionParams = {
      stateMachineArn: savedResources.stepFunctionArn,
      name: `validation-run-${Date.now()}`,
      input: JSON.stringify({
        action: 'run_active_validations',
        timestamp: new Date().toISOString(),
        containerOverrides: {
          ContainerOverrides: [
            {
              Name: containerName,
              Environment: [
                {
                  Name: 'TEST_CASE_SQL',
                  Value: testCaseSQL
                }
              ]
            }
          ]
        }
      })
    };
    
    console.log('🚀 Step Function input:', JSON.stringify(JSON.parse(executionParams.input), null, 2));
    
    console.log('🔄 Starting Step Function:', savedResources.stepFunctionArn);
    
    const execution = await stepfunctions.startExecution(executionParams).promise();
    
    console.log('✅ Step Function started:', execution.executionArn);
    
    // Return success response
    res.json({
      success: true,
      message: 'Validation execution started successfully',
      executionArn: execution.executionArn,
      startDate: execution.startDate,
      stepFunctionArn: savedResources.stepFunctionArn,
      totalValidations: 'In Progress',
      passedValidations: 'Calculating...',
      failedValidations: 'Calculating...'
    });
    
  } catch (error) {
    console.error('❌ Step Function execution error:', error);
    res.status(500).json({
      success: false,
      message: `Step Function execution failed: ${error.message}`
    });
  }
});

// Activity Log API endpoints
app.get('/api/activity/executions', async (req, res) => {
  try {
    console.log('📊 Fetching Step Function executions...');
    
    const fs = require('fs');
    const path = require('path');
    
    const resourcesFile = path.join(__dirname, 'deployments', 'modules', 'validator', 'aws-resources.json');
    const deploymentFile = path.join(__dirname, 'deployments', 'modules', 'validator', 'deployment.json');
    
    if (!fs.existsSync(resourcesFile) || !fs.existsSync(deploymentFile)) {
      return res.json({
        success: true,
        executions: []
      });
    }
    
    const resourcesData = JSON.parse(fs.readFileSync(resourcesFile, 'utf8'));
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const stepFunctionArn = resourcesData.stepFunctionArn;
    const awsConfig = deploymentData.awsConfig;
    
    console.log('📋 AWS Resources loaded:', {
      stepFunctionArn: stepFunctionArn,
      logGroups: resourcesData.logGroups,
      region: awsConfig?.region
    });
    
    if (!stepFunctionArn || !awsConfig) {
      console.log('⚠️ Missing Step Function ARN or AWS config');
      return res.json({
        success: true,
        executions: []
      });
    }
    
    const AWS = require('aws-sdk');
    const stepfunctions = new AWS.StepFunctions({
      accessKeyId: awsConfig.accessKey,
      secretAccessKey: awsConfig.secretKey,
      region: awsConfig.region
    });
    
    // List recent executions
    console.log('🔍 Listing executions for Step Function:', stepFunctionArn);
    const executions = await stepfunctions.listExecutions({
      stateMachineArn: stepFunctionArn,
      maxResults: 10
    }).promise();
    
    console.log(`✅ Found ${executions.executions.length} executions`);
    
    const formattedExecutions = executions.executions.map(exec => ({
      executionArn: exec.executionArn,
      status: exec.status,
      startTime: exec.startDate.toISOString(),
      endTime: exec.stopDate ? exec.stopDate.toISOString() : null,
      logs: [] // Will be populated by separate endpoint
    }));
    
    res.json({
      success: true,
      executions: formattedExecutions
    });
    
  } catch (error) {
    console.error('❌ Error fetching executions:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch executions: ${error.message}`
    });
  }
});

app.get('/api/activity/logs/:executionArn', async (req, res) => {
  try {
    const executionArn = decodeURIComponent(req.params.executionArn);
    const startTime = req.query.startTime; // Optional: timestamp to fetch logs after
    const isIncremental = req.query.incremental === 'true';
    
    console.log('📋 Fetching logs for execution:', executionArn);
    if (isIncremental && startTime) {
      console.log('🔄 Incremental fetch from:', new Date(parseInt(startTime)).toISOString());
    }
    
    const fs = require('fs');
    const path = require('path');
    
    const resourcesFile = path.join(__dirname, 'deployments', 'modules', 'validator', 'aws-resources.json');
    const deploymentFile = path.join(__dirname, 'deployments', 'modules', 'validator', 'deployment.json');
    
    if (!fs.existsSync(resourcesFile) || !fs.existsSync(deploymentFile)) {
      return res.json({
        success: true,
        logs: [],
        taskArn: null
      });
    }
    
    const resourcesData = JSON.parse(fs.readFileSync(resourcesFile, 'utf8'));
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const awsConfig = deploymentData.awsConfig;
    
    const AWS = require('aws-sdk');
    const stepfunctions = new AWS.StepFunctions({
      accessKeyId: awsConfig.accessKey,
      secretAccessKey: awsConfig.secretKey,
      region: awsConfig.region
    });
    
    const cloudwatchLogs = new AWS.CloudWatchLogs({
      accessKeyId: awsConfig.accessKey,
      secretAccessKey: awsConfig.secretKey,
      region: awsConfig.region
    });
    
    // Get execution details
    const execution = await stepfunctions.describeExecution({
      executionArn: executionArn
    }).promise();
    
    let logs = [];
    let taskArn = null;
    
    try {
      // Try to get ECS task logs using the actual log group from aws-resources.json
      const possibleLogGroups = resourcesData.logGroups?.possibleEcsLogs || [
        resourcesData.logGroups?.ecsTask,
        resourcesData.logGroups?.ecsTaskAlt,
        `/ecs/minibeat-validator-task`
      ];
      
      console.log('🔍 Trying log groups for execution:', executionArn.split(':').pop());
      console.log('📋 Available log groups:', possibleLogGroups);
      
      // Extract execution time to find the right log stream
      const executionStartTime = new Date(execution.startDate);
      const executionEndTime = execution.stopDate ? new Date(execution.stopDate) : new Date();
      
      console.log(`🕐 Execution time range: ${executionStartTime.toISOString()} - ${executionEndTime.toISOString()}`);
      
      // Try each possible log group until we find one with logs
      for (const logGroupName of possibleLogGroups.filter(Boolean)) {
        try {
          console.log(`📋 Checking log group: ${logGroupName}`);
          
          // Get log streams that overlap with the execution time
          const streams = await cloudwatchLogs.describeLogStreams({
            logGroupName: logGroupName,
            orderBy: 'LastEventTime',
            descending: true,
            limit: 20 // Check more streams to find the right one
          }).promise();
          
          console.log(`✅ Found ${streams.logStreams.length} streams in ${logGroupName}`);
          
          // Find the stream that was active during this execution
          let targetStream = null;
          for (const stream of streams.logStreams) {
            const streamStart = new Date(stream.firstEventTime || stream.creationTime);
            const streamEnd = new Date(stream.lastEventTime || Date.now());
            
            // Check if this stream overlaps with the execution time
            if (streamStart <= executionEndTime && streamEnd >= executionStartTime) {
              targetStream = stream;
              console.log(`🎯 Found matching stream: ${stream.logStreamName} (${streamStart.toISOString()} - ${streamEnd.toISOString()})`);
              break;
            }
          }
          
          // If no specific stream found, use the most recent one
          if (!targetStream && streams.logStreams.length > 0) {
            targetStream = streams.logStreams[0];
            console.log(`📋 Using most recent stream: ${targetStream.logStreamName}`);
          }
          
          if (targetStream) {
            taskArn = targetStream.logStreamName;
            
            let logParams = {
              logGroupName: logGroupName,
              logStreamName: targetStream.logStreamName,
              limit: 100,
              startFromHead: !isIncremental
            };
            
            if (isIncremental && startTime) {
              // For incremental, only get logs after the specified timestamp
              logParams.startTime = parseInt(startTime) + 1; // +1ms to avoid duplicates
              logParams.startFromHead = false;
            } else {
              // For initial load, get logs within execution timeframe
              logParams.startTime = Math.max(executionStartTime.getTime() - 60000, 0);
              logParams.endTime = executionEndTime.getTime() + 60000;
            }
            
            const logEvents = await cloudwatchLogs.getLogEvents(logParams).promise();
            
            logs = logEvents.events.map(event => ({
              timestamp: new Date(event.timestamp).toISOString(),
              message: event.message.trim(),
              level: event.message.includes('ERROR') ? 'ERROR' : 
                     event.message.includes('WARN') ? 'WARN' : 
                     event.message.includes('INFO') ? 'INFO' : 'DEBUG',
              source: 'ECS'
            }));
            
            console.log(`✅ Retrieved ${logs.length} log entries from ${logGroupName} for execution ${executionArn.split(':').pop()}`);
            break; // Found logs, stop trying other groups
          }
        } catch (groupError) {
          console.log(`⚠️ Log group ${logGroupName} not accessible:`, groupError.message);
          continue; // Try next log group
        }
      }
      
      // If we get here, no logs were found in any log group
      if (logs.length === 0) {
        console.log('⚠️ No logs found in any ECS log group, falling back to Step Function history');
      }
      
    } catch (logError) {
      console.log('⚠️ Could not fetch ECS logs:', logError.message);
      
      // Fallback to Step Function execution history
      const history = await stepfunctions.getExecutionHistory({
        executionArn: executionArn,
        maxResults: 50,
        reverseOrder: false
      }).promise();
      
      logs = history.events.map(event => ({
        timestamp: event.timestamp.toISOString(),
        message: `${event.type}: ${JSON.stringify(event, null, 2)}`,
        level: event.type.includes('Failed') ? 'ERROR' : 'INFO',
        source: 'StepFunction'
      }));
    }
    
    res.json({
      success: true,
      logs: logs,
      taskArn: taskArn
    });
    
  } catch (error) {
    console.error('❌ Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch logs: ${error.message}`,
      logs: [],
      taskArn: null
    });
  }
});

// Auto-cleanup function for uploads and S3 images
async function cleanupAfterDeployment(deploymentId, awsConfig) {
  try {
    addDeploymentLog(deploymentId, 'final-setup', '🧹 Starting auto-cleanup of uploads and S3 images...');
    
    const fs = require('fs');
    const path = require('path');
    
    // 1. Cleanup local uploads folder
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let deletedCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          
          // Delete files older than 1 hour or all files after deployment
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          if (stats.mtime.getTime() < oneHourAgo || true) { // Delete all for now
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (error) {
          console.log(`⚠️ Could not delete upload file ${file}:`, error.message);
        }
      }
      
      addDeploymentLog(deploymentId, 'final-setup', `✅ Cleaned up ${deletedCount} upload files from local storage`);
    }
    
    // 2. Cleanup S3 images (ECR images are handled by AWS lifecycle policies)
    try {
      const AWS = require('aws-sdk');
      AWS.config.update({
        accessKeyId: awsConfig.accessKey,
        secretAccessKey: awsConfig.secretKey,
        region: awsConfig.region
      });
      
      const ecr = new AWS.ECR();
      const repositoryName = `minibeat-validator-${deploymentId.substring(0, 8)}`;
      
      // List images in ECR repository
      const images = await ecr.listImages({
        repositoryName: repositoryName,
        maxResults: 100
      }).promise();
      
      // Keep only the latest 3 images, delete older ones
      if (images.imageIds.length > 3) {
        const imagesToDelete = images.imageIds.slice(3); // Keep first 3, delete rest
        
        if (imagesToDelete.length > 0) {
          await ecr.batchDeleteImage({
            repositoryName: repositoryName,
            imageIds: imagesToDelete
          }).promise();
          
          addDeploymentLog(deploymentId, 'final-setup', `✅ Cleaned up ${imagesToDelete.length} old ECR images`);
        }
      }
      
    } catch (s3Error) {
      addDeploymentLog(deploymentId, 'final-setup', `⚠️ S3/ECR cleanup warning: ${s3Error.message}`);
      // Don't fail deployment for cleanup issues
    }
    
    addDeploymentLog(deploymentId, 'final-setup', '✅ Auto-cleanup completed successfully');
    
  } catch (error) {
    addDeploymentLog(deploymentId, 'final-setup', `⚠️ Auto-cleanup error: ${error.message}`);
    // Don't fail deployment for cleanup issues
  }
}

// Real deployment function - Updated for web-based deployment
async function deployApplication(deploymentId, awsConfig, envVariables, files, imageName, awsResourceConfig = {}) {
  const status = deploymentStatus.get(deploymentId);
  const { accessKey, secretKey, region } = awsConfig;
  
  // For web-based deployment, we'll simulate the process to avoid Docker dependency
  console.log('🌐 Starting web-based deployment simulation...');
  addDeploymentLog(deploymentId, 'ecr-repo', '🌐 Web-based deployment - no local Docker required');
  
  // Determine which step to start from (for retry functionality)
  const stepIds = ['ecr-repo', 'ecr-push', 'task-definition', 'ecs-service', 'step-functions'];
  let startFromStep = 0;
  
  // Find the first non-completed step
  for (let i = 0; i < stepIds.length; i++) {
    if (status.steps[stepIds[i]].status !== 'completed') {
      startFromStep = i;
      break;
    }
  }
  
  console.log(`Starting web-based deployment simulation from step: ${stepIds[startFromStep]}`);
  
  // Generate resource names based on configuration
  const projectName = `validator-${deploymentId.substring(0, 8)}`;
  const repositoryName = awsResourceConfig.ecrRepositoryName || projectName;
  const clusterName = awsResourceConfig.clusterName || `${projectName}-cluster`;
  const serviceName = `${projectName}-service`;
  const taskDefinitionFamily = awsResourceConfig.taskDefinitionFamily || `${projectName}-task`;
  
  // Log resource configuration
  addDeploymentLog(deploymentId, 'ecr-repo', `🎯 Resource Configuration:`);
  addDeploymentLog(deploymentId, 'ecr-repo', `- ECR Repository: ${repositoryName}`);
  addDeploymentLog(deploymentId, 'ecr-repo', `- ECS Cluster: ${clusterName}`);
  addDeploymentLog(deploymentId, 'ecr-repo', `- Task Definition: ${taskDefinitionFamily}`);
  addDeploymentLog(deploymentId, 'ecr-repo', `- Region: ${region}`);
  
  try {
    // Start real AWS deployment process
    await simulateWebDeployment(deploymentId, repositoryName, clusterName, taskDefinitionFamily, region);
    
  } catch (error) {
    console.error('Deployment simulation failed:', error);
    const status = deploymentStatus.get(deploymentId);
    if (status) {
      status.status = 'failed';
      status.error = error.message;
      deploymentStatus.set(deploymentId, status);
    }
  }
}

// Real AWS deployment function
async function simulateWebDeployment(deploymentId, repositoryName, clusterName, taskDefinitionFamily, region) {
  const originalDeployment = deploymentConfigs.get(deploymentId);
  const { awsConfig, envVariables } = originalDeployment;
  
  // Extract timestamp for unique resource naming
  const timestamp = deploymentId.split('-')[1];
  
  // Configure AWS SDK with user credentials
  AWS.config.update({
    accessKeyId: awsConfig.accessKey,
    secretAccessKey: awsConfig.secretKey,
    region: region
  });
  
  const ecr = new AWS.ECR();
  const ecs = new AWS.ECS();
  const iam = new AWS.IAM();
  const logs = new AWS.CloudWatchLogs();
  const ec2 = new AWS.EC2();
  
  let repositoryUri;
  
  try {
    // Step 1: Create ECR Repository
    updateDeploymentStep(deploymentId, 'ecr-repo', 'running');
    addDeploymentLog(deploymentId, 'ecr-repo', '🏗️ Creating ECR repository...');
    
    try {
      const createRepoResult = await ecr.createRepository({
        repositoryName: repositoryName,
        imageScanningConfiguration: { scanOnPush: true }
      }).promise();
      repositoryUri = createRepoResult.repository.repositoryUri;
      addDeploymentLog(deploymentId, 'ecr-repo', `✅ ECR repository created: ${repositoryName}`);
      addDeploymentLog(deploymentId, 'ecr-repo', `Repository URI: ${repositoryUri}`);
      
      // Store ECR repository in deployStatus
      const deployStatus = deploymentStatus.get(deploymentId);
      if (deployStatus) {
        deployStatus.ecrRepository = repositoryUri;
        deploymentStatus.set(deploymentId, deployStatus);
      }
    } catch (error) {
      if (error.code === 'RepositoryAlreadyExistsException') {
        const describeResult = await ecr.describeRepositories({
          repositoryNames: [repositoryName]
        }).promise();
        repositoryUri = describeResult.repositories[0].repositoryUri;
        addDeploymentLog(deploymentId, 'ecr-repo', `⚠️ Repository already exists, using: ${repositoryUri}`);
        
        // Store ECR repository even if it already exists
        const deployStatus = deploymentStatus.get(deploymentId);
        if (deployStatus) {
          deployStatus.ecrRepository = repositoryUri;
          deploymentStatus.set(deploymentId, deployStatus);
        }
      } else {
        throw error;
      }
    }
    updateDeploymentStep(deploymentId, 'ecr-repo', 'completed');
    
    // Step 2: Process and Upload Docker Image to ECR
    updateDeploymentStep(deploymentId, 'ecr-push', 'running');
    addDeploymentLog(deploymentId, 'ecr-push', '📦 Processing uploaded Docker tar file...');
    
    // Get the uploaded Docker tar file
    if (originalDeployment.files && originalDeployment.files.length > 0) {
      const dockerFile = originalDeployment.files[0];
      addDeploymentLog(deploymentId, 'ecr-push', `Processing: ${dockerFile.originalname} (${(dockerFile.size / 1024 / 1024).toFixed(1)} MB)`);
      
      // Upload tar file to S3 first
      const s3 = new AWS.S3();
      const bucketName = `minibeat-builds-${timestamp}`;
      const s3Key = `docker-image.tar`;
      
      try {
        // Create S3 bucket for storing Docker tar files
        addDeploymentLog(deploymentId, 'ecr-push', '🪣 Creating S3 bucket for Docker builds...');
        try {
          await s3.createBucket({ Bucket: bucketName }).promise();
          addDeploymentLog(deploymentId, 'ecr-push', `✅ S3 bucket created: ${bucketName}`);
        } catch (error) {
          if (error.code === 'BucketAlreadyOwnedByYou' || error.code === 'BucketAlreadyExists') {
            addDeploymentLog(deploymentId, 'ecr-push', `⚠️ Using existing S3 bucket: ${bucketName}`);
          } else {
            throw error;
          }
        }
        
        // Upload Docker tar file to S3
        addDeploymentLog(deploymentId, 'ecr-push', '⬆️ Uploading Docker tar to S3...');
        const uploadParams = {
          Bucket: bucketName,
          Key: s3Key,
          Body: require('fs').readFileSync(dockerFile.path),
          ContentType: 'application/x-tar'
        };
        
        await s3.upload(uploadParams).promise();
        addDeploymentLog(deploymentId, 'ecr-push', `✅ Docker tar uploaded to S3: s3://${bucketName}/${s3Key}`);
        
        // Create CodeBuild project to extract and push Docker image
        const codebuild = new AWS.CodeBuild();
        const buildProjectName = `minibeat-build-${timestamp}`;
        
        addDeploymentLog(deploymentId, 'ecr-push', '🏗️ Setting up CodeBuild project...');
        
        // Create buildspec for extracting tar and pushing to ECR
        const buildSpec = {
          version: '0.2',
          phases: {
            pre_build: {
              commands: [
                'echo Logging in to Amazon ECR...',
                `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${repositoryUri.split('/')[0]}`,
                'echo Downloading Docker tar from S3...',
                `aws s3 cp s3://${bucketName}/${s3Key} ./docker-image.tar`
              ]
            },
            build: {
              commands: [
                'echo Loading Docker image from tar...',
                'docker load -i docker-image.tar',
                'echo Getting loaded image name...',
                'IMAGE_NAME=$(docker images --format "table {{.Repository}}:{{.Tag}}" | tail -n +2 | head -n 1)',
                'echo "Loaded image: $IMAGE_NAME"',
                `echo Tagging image for ECR...`,
                `docker tag $IMAGE_NAME ${repositoryUri}:latest`
              ]
            },
            post_build: {
              commands: [
                'echo Pushing image to ECR...',
                `docker push ${repositoryUri}:latest`,
                'echo Docker image push completed!'
              ]
            }
          }
        };

        // Create CodeBuild service role if it doesn't exist
        const serviceRoleName = `minibeat-codebuild-${timestamp}`;
        let serviceRoleArn;
        
        try {
          const roleResult = await iam.createRole({
            RoleName: serviceRoleName,
            AssumeRolePolicyDocument: JSON.stringify({
              Version: '2012-10-17',
              Statement: [{
                Effect: 'Allow',
                Principal: { Service: 'codebuild.amazonaws.com' },
                Action: 'sts:AssumeRole'
              }]
            })
          }).promise();
          serviceRoleArn = roleResult.Role.Arn;
          
          // Attach required policies with logging
          addDeploymentLog(deploymentId, 'ecr-push', '🔐 Attaching IAM policies to CodeBuild role...');
          
          await iam.attachRolePolicy({
            RoleName: serviceRoleName,
            PolicyArn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser'
          }).promise();
          addDeploymentLog(deploymentId, 'ecr-push', '✅ ECR PowerUser policy attached');
          
          await iam.attachRolePolicy({
            RoleName: serviceRoleName,
            PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'
          }).promise();
          addDeploymentLog(deploymentId, 'ecr-push', '✅ S3 ReadOnly policy attached');
          
          await iam.attachRolePolicy({
            RoleName: serviceRoleName,
            PolicyArn: 'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'
          }).promise();
          addDeploymentLog(deploymentId, 'ecr-push', '✅ CloudWatch Logs policy attached');
          
          addDeploymentLog(deploymentId, 'ecr-push', `✅ Created CodeBuild service role: ${serviceRoleArn}`);
          
          // Wait for IAM role propagation across AWS (increased from 10s to 30s)
          addDeploymentLog(deploymentId, 'ecr-push', '⏳ Waiting for IAM role propagation (30 seconds)...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          
        } catch (error) {
          if (error.code === 'EntityAlreadyExistsException') {
            const getRoleResult = await iam.getRole({ RoleName: serviceRoleName }).promise();
            serviceRoleArn = getRoleResult.Role.Arn;
            addDeploymentLog(deploymentId, 'ecr-push', `⚠️ Using existing CodeBuild role: ${serviceRoleArn}`);
            
            // Ensure policies are attached even if role exists
            try {
              await iam.attachRolePolicy({
                RoleName: serviceRoleName,
                PolicyArn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser'
              }).promise();
              
              await iam.attachRolePolicy({
                RoleName: serviceRoleName,
                PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'
              }).promise();
              
              await iam.attachRolePolicy({
                RoleName: serviceRoleName,
                PolicyArn: 'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'
              }).promise();
              
              addDeploymentLog(deploymentId, 'ecr-push', '✅ Verified policies attached to existing role');
            } catch (policyError) {
              // Ignore if policies already attached
              if (policyError.code !== 'LimitExceededException') {
                addDeploymentLog(deploymentId, 'ecr-push', `⚠️ Policy attachment: ${policyError.message}`);
              }
            }
          } else {
            throw error;
          }
        }

        // Create or update CodeBuild project
        const projectParams = {
          name: buildProjectName,
          description: `Build project for ${repositoryName} Docker image`,
          source: {
            type: 'NO_SOURCE',
            buildspec: JSON.stringify(buildSpec)
          },
          artifacts: {
            type: 'NO_ARTIFACTS'
          },
          environment: {
            type: 'LINUX_CONTAINER',
            image: 'aws/codebuild/amazonlinux2-x86_64-standard:3.0',
            computeType: 'BUILD_GENERAL1_MEDIUM',
            privilegedMode: true
          },
          serviceRole: serviceRoleArn
        };

        try {
          await codebuild.createProject(projectParams).promise();
          addDeploymentLog(deploymentId, 'ecr-push', `✅ CodeBuild project created: ${buildProjectName}`);
        } catch (error) {
          if (error.code === 'ResourceAlreadyExistsException') {
            await codebuild.updateProject(projectParams).promise();
            addDeploymentLog(deploymentId, 'ecr-push', `⚠️ Updated existing CodeBuild project: ${buildProjectName}`);
          } else {
            throw error;
          }
        }

        // Start the build
        addDeploymentLog(deploymentId, 'ecr-push', '🚀 Starting CodeBuild to process Docker image...');
        const buildResult = await codebuild.startBuild({
          projectName: buildProjectName
        }).promise();
        
        const buildId = buildResult.build.id;
        addDeploymentLog(deploymentId, 'ecr-push', `Build started: ${buildId}`);
        
        // Wait for build to complete
        let buildStatus = 'IN_PROGRESS';
        while (buildStatus === 'IN_PROGRESS') {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          
          const batchResult = await codebuild.batchGetBuilds({
            ids: [buildId]
          }).promise();
          
          buildStatus = batchResult.builds[0].buildStatus;
          addDeploymentLog(deploymentId, 'ecr-push', `Build status: ${buildStatus}`);
        }
        
        if (buildStatus === 'SUCCEEDED') {
          addDeploymentLog(deploymentId, 'ecr-push', '✅ Docker image successfully pushed to ECR!');
          addDeploymentLog(deploymentId, 'ecr-push', `🎉 Image available at: ${repositoryUri}:latest`);
        } else {
          throw new Error(`CodeBuild failed with status: ${buildStatus}`);
        }
        
      } catch (error) {
        addDeploymentLog(deploymentId, 'ecr-push', `❌ Failed to process Docker image: ${error.message}`);
        throw error;
      }
      
    } else {
      addDeploymentLog(deploymentId, 'ecr-push', '❌ No Docker tar file found in upload');
      throw new Error('No Docker image file uploaded');
    }
    const logGroupName = `/ecs/${repositoryName}`;
    try {
      await logs.createLogGroup({ logGroupName }).promise();
      addDeploymentLog(deploymentId, 'task-definition', `✅ Created log group: ${logGroupName}`);
    } catch (error) {
      if (error.code !== 'ResourceAlreadyExistsException') {
        addDeploymentLog(deploymentId, 'task-definition', `⚠️ Log group error: ${error.message}`);
      }
    }
    
    // Create IAM execution role for ECS (must be <= 64 chars)
    // Extract short identifier from repositoryName (e.g., 'validator' from 'minibeat-validator-repo-deploy-1')
    const moduleId = repositoryName.split('-')[1] || 'module';
    const executionRoleName = `${moduleId}-exec-${crypto.randomBytes(4).toString('hex')}`;
    let executionRoleArn;
    
    try {
      addDeploymentLog(deploymentId, 'task-definition', `Creating execution role: ${executionRoleName}...`);
      const roleResult = await iam.createRole({
        RoleName: executionRoleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'ecs-tasks.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        })
      }).promise();
      executionRoleArn = roleResult.Role.Arn;
      
      await iam.attachRolePolicy({
        RoleName: executionRoleName,
        PolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'
      }).promise();
      
      addDeploymentLog(deploymentId, 'task-definition', `✅ Created execution role: ${executionRoleArn}`);
      
    } catch (error) {
      if (error.code === 'EntityAlreadyExistsException') {
        const getRoleResult = await iam.getRole({ RoleName: executionRoleName }).promise();
        executionRoleArn = getRoleResult.Role.Arn;
        addDeploymentLog(deploymentId, 'task-definition', `⚠️ Using existing execution role: ${executionRoleArn}`);
      } else {
        addDeploymentLog(deploymentId, 'task-definition', `❌ Failed to create execution role: ${error.message}`);
        throw error;
      }
    }
    
    // Create IAM Task Role with SSM Parameter Store permissions (must be <= 64 chars)
    const taskRoleName = `${moduleId}-task-${crypto.randomBytes(4).toString('hex')}`;
    let taskRoleArn;
    
    try {
      addDeploymentLog(deploymentId, 'task-definition', `Creating task role: ${taskRoleName}...`);
      const taskRoleResult = await iam.createRole({
        RoleName: taskRoleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'ecs-tasks.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        })
      }).promise();
      taskRoleArn = taskRoleResult.Role.Arn;
      
      // Create inline policy for SSM Parameter Store and SES access
      const policyDocument = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'ssm:GetParameter',
              'ssm:GetParameters',
              'ssm:GetParametersByPath'
            ],
            Resource: `arn:aws:ssm:${region}:*:parameter/*`
          },
          {
            Effect: 'Allow',
            Action: [
              'kms:Decrypt'
            ],
            Resource: '*'
          },
          {
            Effect: 'Allow',
            Action: [
              'ses:SendEmail',
              'ses:SendRawEmail'
            ],
            Resource: '*'
          }
        ]
      };
      
      await iam.putRolePolicy({
        RoleName: taskRoleName,
        PolicyName: 'SSMParameterStoreAccess',
        PolicyDocument: JSON.stringify(policyDocument)
      }).promise();
      
      addDeploymentLog(deploymentId, 'task-definition', `✅ Created task role with SSM permissions: ${taskRoleArn}`);
      
      // Wait for role propagation
      addDeploymentLog(deploymentId, 'task-definition', '⏳ Waiting for IAM role propagation (15 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
    } catch (error) {
      if (error.code === 'EntityAlreadyExistsException') {
        const getTaskRoleResult = await iam.getRole({ RoleName: taskRoleName }).promise();
        taskRoleArn = getTaskRoleResult.Role.Arn;
        addDeploymentLog(deploymentId, 'task-definition', `⚠️ Using existing task role: ${taskRoleArn}`);
      } else {
        addDeploymentLog(deploymentId, 'task-definition', `❌ Failed to create task role: ${error.message}`);
        throw error;
      }
    }
    
    // Create ECS Task Definition
    addDeploymentLog(deploymentId, 'task-definition', '📝 Registering ECS task definition...');
    
    const taskDefinition = {
      family: taskDefinitionFamily,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu: '256',
      memory: '512',
      executionRoleArn: executionRoleArn,
      taskRoleArn: taskRoleArn,
      containerDefinitions: [{
        name: repositoryName,
        image: `${repositoryUri}:latest`,
        portMappings: [{ containerPort: 8080, protocol: 'tcp' }],
        environment: envVariables.map(env => ({ name: env.key, value: env.value })),
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': logGroupName,
            'awslogs-region': region,
            'awslogs-stream-prefix': 'ecs'
          }
        },
        essential: true
      }]
    };
    
    try {
      const taskDefResult = await ecs.registerTaskDefinition(taskDefinition).promise();
      addDeploymentLog(deploymentId, 'task-definition', `✅ Task definition created: ${taskDefResult.taskDefinition.taskDefinitionArn}`);
      
      // Store task definition info in deployStatus
      const deployStatus = deploymentStatus.get(deploymentId);
      if (deployStatus) {
        deployStatus.taskDefinition = taskDefResult.taskDefinition.taskDefinitionArn;
        deployStatus.taskDefinitionFamily = taskDefinitionFamily;
        deployStatus.executionRoleArn = executionRoleArn;
        deployStatus.taskRoleArn = taskRoleArn;
        deploymentStatus.set(deploymentId, deployStatus);
      }
      
      updateDeploymentStep(deploymentId, 'task-definition', 'completed');
    } catch (error) {
      addDeploymentLog(deploymentId, 'task-definition', `❌ Task definition error: ${error.code} - ${error.message}`);
      throw error;
    }
    
    // Step 4: Create ECS Cluster and Service
    updateDeploymentStep(deploymentId, 'ecs-service', 'running');
    addDeploymentLog(deploymentId, 'ecs-service', '🚀 Creating ECS cluster...');
    
    try {
      await ecs.createCluster({ clusterName }).promise();
      addDeploymentLog(deploymentId, 'ecs-service', `✅ ECS cluster created: ${clusterName}`);
      
      // Store cluster name in deployStatus
      const deployStatus = deploymentStatus.get(deploymentId);
      if (deployStatus) {
        deployStatus.ecsCluster = clusterName;
        deploymentStatus.set(deploymentId, deployStatus);
      }
    } catch (error) {
      if (error.code !== 'ClusterAlreadyExistsException') {
        throw error;
      }
      addDeploymentLog(deploymentId, 'ecs-service', `⚠️ Using existing cluster: ${clusterName}`);
      
      // Store cluster name even if it already exists
      const deployStatus = deploymentStatus.get(deploymentId);
      if (deployStatus) {
        deployStatus.ecsCluster = clusterName;
        deploymentStatus.set(deploymentId, deployStatus);
      }
    }
    
    // Get default VPC and subnets
    addDeploymentLog(deploymentId, 'ecs-service', '🌐 Setting up networking...');
    const vpcs = await ec2.describeVpcs({ Filters: [{ Name: 'isDefault', Values: ['true'] }] }).promise();
    const defaultVpc = vpcs.Vpcs[0];
    
    const subnets = await ec2.describeSubnets({
      Filters: [{ Name: 'vpc-id', Values: [defaultVpc.VpcId] }]
    }).promise();
    
    // Create security group
    const securityGroupName = `${repositoryName}-sg`;
    let securityGroupId;
    try {
      const sgResult = await ec2.createSecurityGroup({
        GroupName: securityGroupName,
        Description: `Security group for ${repositoryName}`,
        VpcId: defaultVpc.VpcId
      }).promise();
      securityGroupId = sgResult.GroupId;
      
      // Add inbound rule for port 8080
      await ec2.authorizeSecurityGroupIngress({
        GroupId: securityGroupId,
        IpPermissions: [{
          IpProtocol: 'tcp',
          FromPort: 8080,
          ToPort: 8080,
          IpRanges: [{ CidrIp: '0.0.0.0/0' }]
        }]
      }).promise();
      
      addDeploymentLog(deploymentId, 'ecs-service', `✅ Security group created: ${securityGroupId}`);
    } catch (error) {
      if (error.code === 'InvalidGroup.Duplicate') {
        const sgs = await ec2.describeSecurityGroups({
          Filters: [{ Name: 'group-name', Values: [securityGroupName] }]
        }).promise();
        securityGroupId = sgs.SecurityGroups[0].GroupId;
        addDeploymentLog(deploymentId, 'ecs-service', `⚠️ Using existing security group: ${securityGroupId}`);
      } else {
        throw error;
      }
    }
    
    // Just create the ECS cluster (no service, just task definition ready)
    addDeploymentLog(deploymentId, 'ecs-service', '🚀 ECS setup completed - task definition ready');
    addDeploymentLog(deploymentId, 'ecs-service', '💡 Tasks will be started on-demand via Step Functions');
    updateDeploymentStep(deploymentId, 'ecs-service', 'completed');
    
    // Step 5: Create Step Functions to start Fargate tasks
    updateDeploymentStep(deploymentId, 'step-functions', 'running');
    addDeploymentLog(deploymentId, 'step-functions', '⚡ Creating Step Functions workflow...');
    
    const stepfunctions = new AWS.StepFunctions();
    const stepFunctionName = `${repositoryName}-workflow`;
    let stepFunctionArn;
    
    // Create Step Functions execution role
    const stepFunctionRoleName = `minibeat-stepfunc-${timestamp}`;
    let stepFunctionRoleArn;
    
    try {
      const roleResult = await iam.createRole({
        RoleName: stepFunctionRoleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'states.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        })
      }).promise();
      stepFunctionRoleArn = roleResult.Role.Arn;
      
      // Skip AWS managed policy - we'll use custom policy only
      addDeploymentLog(deploymentId, 'step-functions', '📋 Creating custom IAM policy for Step Functions...');
      
      // Create custom policy for ECS task management and Step Functions
      const policyDocument = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'ecs:RunTask',
              'ecs:StopTask',
              'ecs:DescribeTasks',
              'iam:PassRole'
            ],
            Resource: '*'
          },
          {
            Effect: 'Allow',
            Action: [
              'events:PutTargets',
              'events:PutRule',
              'events:DescribeRule',
              'events:DeleteRule',
              'events:RemoveTargets',
              'events:TagResource'
            ],
            Resource: '*'
          },
          {
            Effect: 'Allow',
            Action: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
              'logs:DescribeLogGroups',
              'logs:DescribeLogStreams'
            ],
            Resource: '*'
          },
          {
            Effect: 'Allow',
            Action: [
              'states:*'
            ],
            Resource: '*'
          }
        ]
      };
      
      await iam.createPolicy({
        PolicyName: `minibeat-sf-policy-${timestamp}`,
        PolicyDocument: JSON.stringify(policyDocument)
      }).promise();
      
      const userResult = await iam.getUser().promise();
      const accountId = userResult.User.Arn.split(':')[4];
      await iam.attachRolePolicy({
        RoleName: stepFunctionRoleName,
        PolicyArn: `arn:aws:iam::${accountId}:policy/minibeat-sf-policy-${timestamp}`
      }).promise();
      
      addDeploymentLog(deploymentId, 'step-functions', `✅ Step Functions role created: ${stepFunctionRoleArn}`);
      
      // Wait for IAM role propagation across AWS (increased from 10s to 30s)
      addDeploymentLog(deploymentId, 'step-functions', '⏳ Waiting for IAM role propagation (30 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
    } catch (error) {
      if (error.code === 'EntityAlreadyExistsException') {
        const getRoleResult = await iam.getRole({ RoleName: stepFunctionRoleName }).promise();
        stepFunctionRoleArn = getRoleResult.Role.Arn;
        addDeploymentLog(deploymentId, 'step-functions', `⚠️ Using existing Step Functions role`);
      } else {
        throw error;
      }
    }
    
    // Create Step Function state machine with container overrides support
    const stateMachineDefinition = {
      Comment: `Start Fargate task for ${repositoryName}`,
      StartAt: 'StartTask',
      States: {
        StartTask: {
          Type: 'Task',
          Resource: 'arn:aws:states:::ecs:runTask.sync',
          Parameters: {
            LaunchType: 'FARGATE',
            Cluster: clusterName,
            TaskDefinition: taskDefinitionFamily,
            'Overrides.$': '$.containerOverrides',
            NetworkConfiguration: {
              AwsvpcConfiguration: {
                Subnets: subnets.Subnets.slice(0, 2).map(subnet => subnet.SubnetId),
                SecurityGroups: [securityGroupId],
                AssignPublicIp: 'ENABLED'
              }
            }
          },
          End: true
        }
      }
    };
    
    addDeploymentLog(deploymentId, 'step-functions', '💡 Step Function configured to accept container overrides (TEST_CASE_SQL)');
    
    try {
      const stateMachineResult = await stepfunctions.createStateMachine({
        name: stepFunctionName,
        definition: JSON.stringify(stateMachineDefinition),
        roleArn: stepFunctionRoleArn
      }).promise();
      
      stepFunctionArn = stateMachineResult.stateMachineArn;
      addDeploymentLog(deploymentId, 'step-functions', `✅ Step Function created: ${stepFunctionName}`);
      
    } catch (error) {
      addDeploymentLog(deploymentId, 'step-functions', `❌ Step Function creation failed: ${error.message}`);
      throw error;
    }
    
    updateDeploymentStep(deploymentId, 'step-functions', 'completed');
    
    // Mark deployment as completed after Step Functions
    const deployStatus = deploymentStatus.get(deploymentId);
    if (deployStatus) {
      deployStatus.status = 'completed';
      deployStatus.currentStep = 'step-functions';
      deployStatus.completedAt = new Date().toISOString();
      deployStatus.stepFunctionArn = stepFunctionArn;
      deployStatus.region = region;
      deploymentStatus.set(deploymentId, deployStatus);
    }
    
    addDeploymentLog(deploymentId, 'step-functions', '🎉 Deployment completed successfully!');
    
    // Save deployment data to persistent storage
    try {
      // Get deployment config and status from stored data
      const storedConfig = deploymentConfigs.get(deploymentId);
      const module = storedConfig?.deploymentConfig?.module || 'validator';
      const imageName = storedConfig?.imageName || 'unknown';
      const awsConfigData = storedConfig?.awsConfig || awsConfig;
      const envVarsData = storedConfig?.envVariables || envVariables;
      
      const DEPLOYMENTS_DIR = path.join(__dirname, 'deployments');
      const MODULES_DIR = path.join(DEPLOYMENTS_DIR, 'modules');
      const moduleDir = path.join(MODULES_DIR, module);
      
      // Ensure directories exist
      if (!fs.existsSync(DEPLOYMENTS_DIR)) fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
      if (!fs.existsSync(MODULES_DIR)) fs.mkdirSync(MODULES_DIR, { recursive: true });
      if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });
      
      // Build AWS resources object (use deployStatus values which were stored during deployment)
      // Extract repositoryName from ecrRepository URI for log group
      const ecrRepo = deployStatus?.ecrRepository || 'unknown';
      const repositoryNameFromUri = ecrRepo.includes('/') ? ecrRepo.split('/').pop() : 'unknown';
      
      const awsResources = {
        stepFunctionArn: stepFunctionArn,
        ecsCluster: deployStatus?.ecsCluster || 'unknown',
        ecsService: null, // On-demand deployment
        taskDefinition: deployStatus?.taskDefinition || 'unknown',
        taskDefinitionFamily: deployStatus?.taskDefinitionFamily || 'unknown',
        executionRoleArn: deployStatus?.executionRoleArn || 'unknown',
        taskRoleArn: deployStatus?.taskRoleArn || 'unknown',
        ecrRepository: ecrRepo,
        region: region,
        logGroups: {
          possibleEcsLogs: [`/ecs/${repositoryNameFromUri}`]
        }
      };
      
      // Save deployment details
      const deploymentFile = path.join(moduleDir, 'deployment.json');
      const dataToSave = {
        id: deploymentId,
        status: 'completed',
        module: module,
        awsConfig: awsConfigData,
        envVariables: envVarsData,
        imageName: imageName,
        completedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        awsResources: awsResources
      };
      
      fs.writeFileSync(deploymentFile, JSON.stringify(dataToSave, null, 2));
      addDeploymentLog(deploymentId, 'step-functions', `💾 Deployment saved: ${deploymentFile}`);
      
      // Save AWS resources separately
      const resourcesFile = path.join(moduleDir, 'aws-resources.json');
      fs.writeFileSync(resourcesFile, JSON.stringify(awsResources, null, 2));
      addDeploymentLog(deploymentId, 'step-functions', `📋 AWS Resources saved: ${resourcesFile}`);
      
      console.log(`✅ Deployment ${deploymentId} saved to ${moduleDir}`);
    } catch (error) {
      console.error(`Error saving deployment files: ${error.message}`);
      addDeploymentLog(deploymentId, 'step-functions', `⚠️ Warning: Could not save deployment files: ${error.message}`);
    }
    
    // Auto-cleanup uploads folder after deployment
    await cleanupAfterDeployment(deploymentId, awsConfig);
    
    // Skip API Gateway and Final Setup - deployment is complete
    return;
    
    // Create API Gateway execution role
    const apiGatewayRoleName = `${repositoryName}-apigateway-role`;
    let apiGatewayRoleArn;
    
    try {
      const apiRoleResult = await iam.createRole({
        RoleName: apiGatewayRoleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'apigateway.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        })
      }).promise();
      apiGatewayRoleArn = apiRoleResult.Role.Arn;
      
      // Create policy for API Gateway to call Step Functions
      const apiGatewayPolicyDocument = {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: [
            'states:StartExecution'
          ],
          Resource: stepFunctionArn
        }]
      };
      
      await iam.createPolicy({
        PolicyName: `${repositoryName}-apigateway-policy`,
        PolicyDocument: JSON.stringify(apiGatewayPolicyDocument)
      }).promise();
      
      const userResult = await iam.getUser().promise();
      const accountId = userResult.User.Arn.split(':')[4];
      await iam.attachRolePolicy({
        RoleName: apiGatewayRoleName,
        PolicyArn: `arn:aws:iam::${accountId}:policy/${repositoryName}-apigateway-policy`
      }).promise();
      
      addDeploymentLog(deploymentId, 'api-gateway', `✅ API Gateway role created: ${apiGatewayRoleArn}`);
      
      // Wait for role propagation (reduced from 10s to 2s)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      if (error.code === 'EntityAlreadyExistsException') {
        const getRoleResult = await iam.getRole({ RoleName: apiGatewayRoleName }).promise();
        apiGatewayRoleArn = getRoleResult.Role.Arn;
        addDeploymentLog(deploymentId, 'api-gateway', `⚠️ Using existing API Gateway role`);
      } else {
        throw error;
      }
    }
    
    const apigateway = new AWS.APIGateway();
    const apiName = `${repositoryName}-api`;
    let apiEndpoint = null;
    
    try {
      // Create REST API
      const apiResult = await apigateway.createRestApi({
        name: apiName,
        description: `API Gateway for ${repositoryName} - triggers Step Functions`,
        endpointConfiguration: {
          types: ['REGIONAL']
        }
      }).promise();
      
      const apiId = apiResult.id;
      addDeploymentLog(deploymentId, 'api-gateway', `✅ API Gateway created: ${apiId}`);
      
      // Get root resource
      const resources = await apigateway.getResources({
        restApiId: apiId
      }).promise();
      
      const rootResourceId = resources.items.find(item => item.path === '/').id;
      
      // Create /start resource
      const startResource = await apigateway.createResource({
        restApiId: apiId,
        parentId: rootResourceId,
        pathPart: 'start'
      }).promise();
      
      // Create POST method
      await apigateway.putMethod({
        restApiId: apiId,
        resourceId: startResource.id,
        httpMethod: 'POST',
        authorizationType: 'NONE'
      }).promise();
      
      // Set up integration to Step Functions
      await apigateway.putIntegration({
        restApiId: apiId,
        resourceId: startResource.id,
        httpMethod: 'POST',
        type: 'AWS',
        integrationHttpMethod: 'POST',
        uri: `arn:aws:apigateway:${region}:states:action/StartExecution`,
        credentials: apiGatewayRoleArn,
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${stepFunctionArn}",
            "input": "$input.body"
          }`
        }
      }).promise();
      
      // Set up method response
      await apigateway.putMethodResponse({
        restApiId: apiId,
        resourceId: startResource.id,
        httpMethod: 'POST',
        statusCode: '200'
      }).promise();
      
      // Set up integration response
      await apigateway.putIntegrationResponse({
        restApiId: apiId,
        resourceId: startResource.id,
        httpMethod: 'POST',
        statusCode: '200'
      }).promise();
      
      // Deploy API
      await apigateway.createDeployment({
        restApiId: apiId,
        stageName: 'prod'
      }).promise();
      
      apiEndpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/prod/start`;
      addDeploymentLog(deploymentId, 'api-gateway', `✅ API Gateway deployed: ${apiEndpoint}`);
      addDeploymentLog(deploymentId, 'api-gateway', '💡 POST to this endpoint to start a Fargate task');
      
    } catch (error) {
      addDeploymentLog(deploymentId, 'api-gateway', `⚠️ API Gateway creation failed: ${error.message}`);
    }
    
    updateDeploymentStep(deploymentId, 'api-gateway', 'completed');
    
    // Step 7: Final Setup
    updateDeploymentStep(deploymentId, 'final-setup', 'running');
    addDeploymentLog(deploymentId, 'final-setup', '🎯 Finalizing deployment...');
    
    addDeploymentLog(deploymentId, 'final-setup', `✅ ECS Cluster: ${clusterName}`);
    addDeploymentLog(deploymentId, 'final-setup', `✅ Task Definition: ${taskDefinitionFamily}`);
    addDeploymentLog(deploymentId, 'final-setup', `✅ Step Function: ${stepFunctionName}`);
    
    if (apiEndpoint) {
      addDeploymentLog(deploymentId, 'final-setup', `🌐 API Endpoint: ${apiEndpoint}`);
      addDeploymentLog(deploymentId, 'final-setup', '💡 POST to this endpoint to start a Fargate task');
      addDeploymentLog(deploymentId, 'final-setup', '📝 Example: curl -X POST ' + apiEndpoint + ' -d "{}"');
    }
    
    addDeploymentLog(deploymentId, 'final-setup', '✅ Deployment completed successfully!');
    addDeploymentLog(deploymentId, 'final-setup', '🚀 On-demand Fargate tasks ready via API Gateway + Step Functions');
    
    // Step 8: Cleanup - Delete S3 bucket and local files
    addDeploymentLog(deploymentId, 'final-setup', '🧹 Starting cleanup process...');
    
    try {
      // Delete S3 bucket and all contents
      const s3 = new AWS.S3();
      const bucketName = `${repositoryName}-docker-builds`;
      
      addDeploymentLog(deploymentId, 'final-setup', `🗑️ Deleting S3 bucket: ${bucketName}`);
      
      // First, delete all objects in the bucket
      const listResult = await s3.listObjectsV2({ Bucket: bucketName }).promise();
      if (listResult.Contents && listResult.Contents.length > 0) {
        const deleteParams = {
          Bucket: bucketName,
          Delete: {
            Objects: listResult.Contents.map(obj => ({ Key: obj.Key }))
          }
        };
        await s3.deleteObjects(deleteParams).promise();
        addDeploymentLog(deploymentId, 'final-setup', `✅ Deleted ${listResult.Contents.length} objects from S3`);
      }
      
      // Then delete the bucket itself
      await s3.deleteBucket({ Bucket: bucketName }).promise();
      addDeploymentLog(deploymentId, 'final-setup', '✅ S3 bucket deleted successfully');
      
    } catch (s3Error) {
      addDeploymentLog(deploymentId, 'final-setup', `⚠️ S3 cleanup warning: ${s3Error.message}`);
      // Don't fail deployment for cleanup issues
    }
    
    try {
      // Clean up local uploaded files
      const originalDeployment = deploymentConfigs.get(deploymentId);
      if (originalDeployment && originalDeployment.files && originalDeployment.files.dockerImage) {
        const dockerFile = originalDeployment.files.dockerImage[0];
        const fs = require('fs');
        
        if (fs.existsSync(dockerFile.path)) {
          fs.unlinkSync(dockerFile.path);
          addDeploymentLog(deploymentId, 'final-setup', `✅ Deleted local file: ${dockerFile.originalname}`);
        }
      }
      
      // Clean up old uploaded files (older than 1 hour)
      const uploadsDir = require('path').join(__dirname, 'uploads');
      if (require('fs').existsSync(uploadsDir)) {
        const files = require('fs').readdirSync(uploadsDir);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        let deletedCount = 0;
        
        files.forEach(file => {
          const filePath = require('path').join(uploadsDir, file);
          const stats = require('fs').statSync(filePath);
          
          if (stats.mtime.getTime() < oneHourAgo) {
            require('fs').unlinkSync(filePath);
            deletedCount++;
          }
        });
        
        if (deletedCount > 0) {
          addDeploymentLog(deploymentId, 'final-setup', `✅ Cleaned up ${deletedCount} old upload files`);
        }
      }
      
    } catch (fileError) {
      addDeploymentLog(deploymentId, 'final-setup', `⚠️ File cleanup warning: ${fileError.message}`);
      // Don't fail deployment for cleanup issues
    }
    
    addDeploymentLog(deploymentId, 'final-setup', '🎉 Cleanup completed - all temporary files removed');
    
    // Auto-cleanup uploads folder and S3 images after deployment
    await cleanupAfterDeployment(deploymentId, awsConfig);
    
    updateDeploymentStep(deploymentId, 'final-setup', 'completed');
    
    // Mark deployment as completed and save all AWS resources
    const status = deploymentStatus.get(deploymentId);
    const config = deploymentConfigs.get(deploymentId);
    
    if (status) {
      status.status = 'completed';
      status.apiEndpoint = apiEndpoint || `Step Function: ${stepFunctionName}`;
      status.completedAt = new Date().toISOString();
      status.timestamp = Date.now();
      
      // Get account ID for ARNs
      const accountId = status.accountId || '156075000715'; // Will be populated during IAM setup
      
      // Save all AWS resource details for persistence
      status.awsResources = {
        // Core resources
        ecrRepository: repositoryName,
        ecsCluster: clusterName,
        taskDefinition: taskDefinitionFamily,
        stepFunction: stepFunctionName,
        region: region,
        accountId: accountId,
        
        // ARNs for direct access
        stepFunctionArn: `arn:aws:states:${region}:${accountId}:stateMachine:${stepFunctionName}`,
        taskDefinitionArn: `arn:aws:ecs:${region}:${accountId}:task-definition/${taskDefinitionFamily}:1`,
        clusterArn: `arn:aws:ecs:${region}:${accountId}:cluster/${clusterName}`,
        
        // CloudWatch log groups (ECS tasks create these automatically)
        logGroups: {
          ecsTask: `/ecs/${taskDefinitionFamily}`,
          ecsTaskAlt: `/aws/ecs/${taskDefinitionFamily}`,
          stepFunction: `/aws/stepfunctions/${stepFunctionName}`,
          apiGateway: `/aws/apigateway/${repositoryName}`,
          // Try multiple naming patterns
          possibleEcsLogs: [
            `/ecs/${taskDefinitionFamily}`,
            `/aws/ecs/${taskDefinitionFamily}`,
            `/ecs/${repositoryName}`,
            `/aws/ecs/${repositoryName}`
          ]
        },
        
        // API endpoints
        apiGateway: apiEndpoint,
        deploymentDate: new Date().toISOString()
      };
      
      // Add configuration details
      if (config) {
        status.awsConfig = config.awsConfig;
        status.envVariables = config.envVariables;
        status.imageName = config.imageName;
      }
      
      deploymentStatus.set(deploymentId, status);
      
      // Save deployment to file system for persistence across restarts
      const fs = require('fs');
      const path = require('path');
      
      const DEPLOYMENTS_DIR = path.join(__dirname, 'deployments');
      const MODULES_DIR = path.join(DEPLOYMENTS_DIR, 'modules');
      const module = config?.deploymentConfig?.module || 'validator';
      const moduleDir = path.join(MODULES_DIR, module);
      
      // Ensure directories exist
      if (!fs.existsSync(DEPLOYMENTS_DIR)) fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
      if (!fs.existsSync(MODULES_DIR)) fs.mkdirSync(MODULES_DIR, { recursive: true });
      if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });
      
      // Save deployment details
      const deploymentFile = path.join(moduleDir, 'deployment.json');
      const dataToSave = {
        ...status,
        module: module,
        savedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(deploymentFile, JSON.stringify(dataToSave, null, 2));
      
      // Save AWS resources separately for easy access
      const resourcesFile = path.join(moduleDir, 'aws-resources.json');
      fs.writeFileSync(resourcesFile, JSON.stringify(status.awsResources, null, 2));
      
      console.log(`💾 Deployment ${deploymentId} completed and saved to file system`);
      console.log(`📋 AWS Resources saved: ${resourcesFile}`);
      console.log(`🔗 Step Function ARN: ${status.awsResources.stepFunctionArn}`);
      console.log(`📊 Log Groups: ${JSON.stringify(status.awsResources.logGroups.possibleEcsLogs)}`);
    }
    
  } catch (error) {
    addDeploymentLog(deploymentId, 'final-setup', `❌ Deployment failed: ${error.message}`);
    throw error;
  }
}

function updateDeploymentStep(deploymentId, stepId, status, details = null) {
  const deployment = deploymentStatus.get(deploymentId);
  if (deployment && deployment.steps[stepId]) {
    deployment.steps[stepId].status = status;
    if (status === 'running' && !deployment.steps[stepId].startTime) {
      deployment.steps[stepId].startTime = Date.now();
    }
    if (status === 'completed' && deployment.steps[stepId].startTime) {
      deployment.steps[stepId].endTime = Date.now();
    }
    if (status === 'error') {
      deployment.status = 'failed';
      deployment.error = details || 'Step failed';
      deployment.steps[stepId].details = details;
    }
    if (details) {
      deployment.steps[stepId].details = details;
    }
    deploymentStatus.set(deploymentId, deployment);
    console.log(`Deployment ${deploymentId}: Step ${stepId} -> ${status}${details ? ` (${details})` : ''}`);
  }
}

function addDeploymentLog(deploymentId, stepId, logMessage) {
  const deployment = deploymentStatus.get(deploymentId);
  if (deployment && deployment.steps[stepId]) {
    if (!deployment.steps[stepId].logs) {
      deployment.steps[stepId].logs = [];
    }
    const timestamp = new Date().toISOString();
    deployment.steps[stepId].logs.push({
      timestamp,
      message: logMessage
    });
    // Save deployment back to Map so logs are available to API
    deploymentStatus.set(deploymentId, deployment);
    console.log(`[${deploymentId}/${stepId}] ${logMessage}`);
  }
}

// Dashboard API endpoints
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const deploymentsDir = path.join(__dirname, 'deployments', 'modules');
    let activeDeployments = 0;
    let totalValidations = 0;
    
    // Count deployments from all modules
    ['validator', 'migrator', 'reconciliator'].forEach(module => {
      const moduleDir = path.join(deploymentsDir, module);
      if (fs.existsSync(moduleDir)) {
        const files = fs.readdirSync(moduleDir).filter(f => f.endsWith('.json'));
        activeDeployments += files.length;
      }
    });
    
    // Estimate validations based on deployments
    totalValidations = activeDeployments * 15;
    
    res.json({
      success: true,
      stats: {
        activeDeployments,
        totalValidations,
        successRate: activeDeployments > 0 ? 95 : 0,
        awsRegions: 1
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.json({ success: true, stats: { activeDeployments: 0, totalValidations: 0, successRate: 0, awsRegions: 1 } });
  }
});

app.get('/api/dashboard/activity', (req, res) => {
  try {
    const activities = [];
    const deploymentsDir = path.join(__dirname, 'deployments', 'modules');
    
    ['validator', 'migrator', 'reconciliator'].forEach(module => {
      const moduleDir = path.join(deploymentsDir, module);
      if (fs.existsSync(moduleDir)) {
        const files = fs.readdirSync(moduleDir).filter(f => f.endsWith('.json'));
        files.forEach(file => {
          const filePath = path.join(moduleDir, file);
          const stats = fs.statSync(filePath);
          const timeDiff = Date.now() - stats.mtime.getTime();
          const timeAgo = timeDiff < 3600000 ? `${Math.floor(timeDiff / 60000)} mins ago` : `${Math.floor(timeDiff / 3600000)} hours ago`;
          
          activities.push({
            module: module.charAt(0).toUpperCase() + module.slice(1),
            action: 'Deployment completed',
            time: timeAgo,
            status: 'success'
          });
        });
      }
    });
    
    res.json({ success: true, activity: activities.slice(0, 10) });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.json({ success: true, activity: [] });
  }
});

app.get('/api/dashboard/trend', (req, res) => {
  try {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const trend = days.map(date => ({
      date,
      deployments: Math.floor(Math.random() * 10) + 3 // Placeholder data
    }));
    
    res.json({ success: true, trend });
  } catch (error) {
    console.error('Error fetching trend:', error);
    res.json({ success: true, trend: [] });
  }
});

app.get('/api/dashboard/metrics', (req, res) => {
  try {
    const metrics = [
      { module: 'Validator', success: 42, failed: 3 },
      { module: 'Migrator', success: 28, failed: 2 },
      { module: 'Reconciliator', success: 35, failed: 1 }
    ];
    
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.json({ success: true, metrics: [] });
  }
});

app.get('/api/config/snowflake', (req, res) => {
  try {
    // Read from deployments folder (in Docker volume)
    const configPath = path.join(__dirname, 'deployments', 'snowflake-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      res.json({ success: true, config });
    } else {
      res.json({ success: false, message: 'Config not found' });
    }
  } catch (error) {
    console.error('Error reading Snowflake config:', error);
    res.status(500).json({ success: false, message: 'Failed to read config' });
  }
});

app.post('/api/config/snowflake', (req, res) => {
  try {
    // Save to deployments folder (in Docker volume)
    const deploymentsDir = path.join(__dirname, 'deployments');
    const configPath = path.join(deploymentsDir, 'snowflake-config.json');
    
    // Create deployments directory if it doesn't exist
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save config
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
    console.log('✅ Snowflake config saved to deployments folder (persisted in Docker volume)');
    res.json({ success: true, message: 'Snowflake config saved' });
  } catch (error) {
    console.error('Error saving Snowflake config:', error);
    res.status(500).json({ success: false, message: 'Failed to save config' });
  }
});

// Get validation summary from Snowflake
app.post('/api/validation-summary', async (req, res) => {
  try {
    console.log('📊 Fetching validation summary from Snowflake...');
    
    // Get Snowflake config from request body or fall back to file
    let snowflakeConfig = req.body;
    
    // If no config in body, try to read from file
    if (!snowflakeConfig || !snowflakeConfig.account) {
      const configPath = path.join(__dirname, 'deployments', 'snowflake-config.json');
      if (!fs.existsSync(configPath)) {
        return res.status(400).json({
          success: false,
          message: 'Snowflake configuration not found. Please configure Snowflake first.'
        });
      }
      snowflakeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // Create Snowflake connection
    const connection = snowflake.createConnection({
      account: snowflakeConfig.account,
      username: snowflakeConfig.username,
      password: snowflakeConfig.password,
      warehouse: snowflakeConfig.warehouse,
      database: snowflakeConfig.database,
      schema: snowflakeConfig.schema
    });
    
    // Connect and execute query
    connection.connect((err, conn) => {
      if (err) {
        console.error('❌ Failed to connect to Snowflake:', err);
        return res.status(500).json({
          success: false,
          message: `Failed to connect to Snowflake: ${err.message}`
        });
      }
      
      console.log('✅ Connected to Snowflake, executing query...');
      
      const query = `
        WITH latest AS (
            SELECT *
            FROM WARNER_MONITORING.VALIDATOR.TBL_VALIDATION_RESULTS
            WHERE execution_type = 'L'
        )
        SELECT 
            cfg.entity                          AS Application,
            cfg.validation_description           AS Description,
            res.validation_status                AS Status,
            res.comment                          AS Comment
        FROM latest res
        JOIN tbl_validating_test_cases cfg 
              ON cfg.id = res.validation_id
        ORDER BY 
            cfg.entity, 
            cfg.validation_description
      `;
      
      conn.execute({
        sqlText: query,
        complete: (err, stmt, rows) => {
          // Always destroy connection
          conn.destroy((destroyErr) => {
            if (destroyErr) {
              console.error('Error destroying connection:', destroyErr);
            }
          });
          
          if (err) {
            console.error('❌ Query execution failed:', err);
            return res.status(500).json({
              success: false,
              message: `Query failed: ${err.message}`
            });
          }
          
          console.log(`✅ Query successful, ${rows.length} rows returned`);
          
          res.json({
            success: true,
            data: rows,
            count: rows.length
          });
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error fetching validation summary:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch validation summary: ${error.message}`
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
