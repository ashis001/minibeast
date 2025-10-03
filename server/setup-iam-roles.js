#!/usr/bin/env node
/**
 * IAM Role Setup Script for Data Deployer
 * 
 * This script helps create the required IAM roles for the deployment system.
 * Run this with an AWS user that has IAM permissions, or ask your AWS admin to run it.
 */

const AWS = require('aws-sdk');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupIAMRoles() {
  console.log('🔧 Data Deployer IAM Role Setup\n');
  
  // Get AWS credentials
  const accessKey = await prompt('Enter AWS Access Key ID: ');
  const secretKey = await prompt('Enter AWS Secret Access Key: ');
  const region = await prompt('Enter AWS Region (default: us-east-1): ') || 'us-east-1';
  
  // Configure AWS SDK
  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: region
  });
  
  const iam = new AWS.IAM();
  
  console.log('\n🚀 Creating IAM roles...\n');
  
  try {
    // 1. Create CodeBuild Service Role
    console.log('1. Creating CodeBuild service role...');
    const codeBuildRoleName = 'data-deployer-codebuild-role';
    
    try {
      const codeBuildRole = await iam.createRole({
        RoleName: codeBuildRoleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'codebuild.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        }),
        Description: 'Service role for Data Deployer CodeBuild projects'
      }).promise();
      
      console.log(`✅ Created CodeBuild role: ${codeBuildRole.Role.Arn}`);
      
      // Attach policies
      await iam.attachRolePolicy({
        RoleName: codeBuildRoleName,
        PolicyArn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser'
      }).promise();
      
      await iam.attachRolePolicy({
        RoleName: codeBuildRoleName,
        PolicyArn: 'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'
      }).promise();
      
      await iam.attachRolePolicy({
        RoleName: codeBuildRoleName,
        PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'
      }).promise();
      
      console.log('✅ Attached required policies to CodeBuild role');
      
    } catch (error) {
      if (error.code === 'EntityAlreadyExistsException') {
        console.log('ℹ️  CodeBuild role already exists');
      } else {
        throw error;
      }
    }
    
    // 2. Create ECS Task Execution Role
    console.log('\n2. Creating ECS task execution role...');
    const ecsRoleName = 'data-deployer-ecs-execution-role';
    
    try {
      const ecsRole = await iam.createRole({
        RoleName: ecsRoleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'ecs-tasks.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        }),
        Description: 'Task execution role for Data Deployer ECS tasks'
      }).promise();
      
      console.log(`✅ Created ECS execution role: ${ecsRole.Role.Arn}`);
      
      // Attach policy
      await iam.attachRolePolicy({
        RoleName: ecsRoleName,
        PolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'
      }).promise();
      
      console.log('✅ Attached required policies to ECS execution role');
      
    } catch (error) {
      if (error.code === 'EntityAlreadyExistsException') {
        console.log('ℹ️  ECS execution role already exists');
      } else {
        throw error;
      }
    }
    
    console.log('\n🎉 IAM roles setup completed successfully!');
    console.log('\nThe following roles are now available for the Data Deployer:');
    console.log(`- CodeBuild Role: ${codeBuildRoleName}`);
    console.log(`- ECS Execution Role: ${ecsRoleName}`);
    console.log('\nYou can now run deployments without IAM role creation permissions.');
    
  } catch (error) {
    console.error('\n❌ Error setting up IAM roles:', error.message);
    console.log('\nPlease ensure you have the following IAM permissions:');
    console.log('- iam:CreateRole');
    console.log('- iam:AttachRolePolicy');
    console.log('- iam:GetRole');
  }
  
  rl.close();
}

// Run the setup
setupIAMRoles().catch(console.error);
