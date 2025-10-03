#!/usr/bin/env node
/**
 * Verify AWS Resources Script
 * This script checks what resources actually exist in your AWS account
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

async function verifyResources() {
  console.log('🔍 AWS Resource Verification Tool\n');
  
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
  
  console.log('\n🚀 Checking AWS resources...\n');
  
  try {
    // Check ECR repositories
    console.log('📦 ECR Repositories:');
    const ecr = new AWS.ECR();
    const repos = await ecr.describeRepositories().promise();
    const validatorRepos = repos.repositories.filter(r => r.repositoryName.startsWith('validator-'));
    
    if (validatorRepos.length > 0) {
      validatorRepos.forEach(repo => {
        console.log(`  ✅ ${repo.repositoryName} - ${repo.repositoryUri}`);
      });
    } else {
      console.log('  ❌ No validator repositories found');
    }
    
    // Check ECS clusters
    console.log('\n🏗️  ECS Clusters:');
    const ecs = new AWS.ECS();
    const clusters = await ecs.listClusters().promise();
    const validatorClusters = clusters.clusterArns.filter(c => c.includes('validator-'));
    
    if (validatorClusters.length > 0) {
      for (const clusterArn of validatorClusters) {
        const clusterName = clusterArn.split('/').pop();
        console.log(`  ✅ ${clusterName}`);
        
        // Check services in this cluster
        const services = await ecs.listServices({ cluster: clusterArn }).promise();
        if (services.serviceArns.length > 0) {
          console.log(`    Services:`);
          for (const serviceArn of services.serviceArns) {
            const serviceName = serviceArn.split('/').pop();
            console.log(`      - ${serviceName}`);
            
            // Get service details
            const serviceDetails = await ecs.describeServices({
              cluster: clusterArn,
              services: [serviceArn]
            }).promise();
            
            const service = serviceDetails.services[0];
            console.log(`        Status: ${service.status}`);
            console.log(`        Running: ${service.runningCount}/${service.desiredCount}`);
          }
        }
      }
    } else {
      console.log('  ❌ No validator clusters found');
    }
    
    // Check IAM roles
    console.log('\n🔐 IAM Roles:');
    const iam = new AWS.IAM();
    const roles = await iam.listRoles().promise();
    const validatorRoles = roles.Roles.filter(r => r.RoleName.startsWith('validator-'));
    
    if (validatorRoles.length > 0) {
      validatorRoles.forEach(role => {
        console.log(`  ✅ ${role.RoleName} - ${role.Arn}`);
      });
    } else {
      console.log('  ❌ No validator roles found');
    }
    
    // Check CodeBuild projects
    console.log('\n🔨 CodeBuild Projects:');
    const codebuild = new AWS.CodeBuild();
    const projects = await codebuild.listProjects().promise();
    const validatorProjects = projects.projects.filter(p => p.startsWith('validator-'));
    
    if (validatorProjects.length > 0) {
      validatorProjects.forEach(project => {
        console.log(`  ✅ ${project}`);
      });
    } else {
      console.log('  ❌ No validator CodeBuild projects found');
    }
    
    console.log('\n✅ Resource verification complete!');
    console.log('\nIf you see resources above, they ARE real and deployed in AWS!');
    
  } catch (error) {
    console.error('\n❌ Error checking resources:', error.message);
  }
  
  rl.close();
}

// Run the verification
verifyResources().catch(console.error);
