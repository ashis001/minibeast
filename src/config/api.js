// API Configuration - Now using Vercel serverless functions
const API_BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🔧 Using Vercel serverless functions');

export const API_ENDPOINTS = {
  // Health endpoints
  HEALTH: `${API_BASE_URL}/health`,
  
  // Snowflake endpoints
  SNOWFLAKE_ENTITIES: `${API_BASE_URL}/api/snowflake/entities`,
  SNOWFLAKE_DESCRIPTIONS: `${API_BASE_URL}/api/snowflake/descriptions`,
  SNOWFLAKE_VALIDATIONS_FILTERED: `${API_BASE_URL}/api/snowflake/validations-filtered`,
  SNOWFLAKE_UPDATE_VALIDATION: `${API_BASE_URL}/api/snowflake/update-validation`,
  SNOWFLAKE_UPDATE_VALIDATIONS: `${API_BASE_URL}/api/snowflake/update-validations`,
  SNOWFLAKE_TABLES: `${API_BASE_URL}/api/snowflake/tables`,
  SNOWFLAKE_CREATE_CONFIG_TABLE: `${API_BASE_URL}/api/snowflake/create-config-table`,
  SNOWFLAKE_INSERT_VALIDATION: `${API_BASE_URL}/api/snowflake/insert-validation`,
  
  // Test endpoints
  TEST_AWS: `${API_BASE_URL}/api/test-aws`,
  TEST_SNOWFLAKE: `${API_BASE_URL}/api/test-snowflake`,
  
  // Deployment endpoints
  DEPLOY: `${API_BASE_URL}/api/deploy`,
  DEPLOYMENT_STATUS: `${API_BASE_URL}/api/deployment`,
  DEPLOYMENT_MODULE_STATUS: `${API_BASE_URL}/api/deployment/status`,
  DEPLOYMENT_CLEAR: `${API_BASE_URL}/api/deployment/clear`,
  DEPLOYMENTS_CHECK: `${API_BASE_URL}/api/deployments/check`,
  
  // Step Function endpoints
  STEPFUNCTION_EXECUTE: `${API_BASE_URL}/api/stepfunction/execute`,
  
  // Activity endpoints
  ACTIVITY_EXECUTIONS: `${API_BASE_URL}/api/activity/executions`,
  ACTIVITY_LOGS: `${API_BASE_URL}/api/activity/logs`,
  
  // Setup endpoints
  SETUP_PERMISSIONS: `${API_BASE_URL}/api/setup-permissions`
};

export { API_BASE_URL };
export default API_BASE_URL;
