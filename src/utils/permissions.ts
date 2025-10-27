/**
 * Role-based access control utility functions
 */

/**
 * Check if user can access a module based on BOTH role permissions AND organization features
 * @param userPermissions - Role-based permissions from user.permissions.modules
 * @param organizationFeatures - Organization features from user.license.features
 * @param module - Module name to check
 */
export const canAccessModule = (
  userPermissions: string[], 
  module: string,
  organizationFeatures?: string[]
): boolean => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  
  const moduleKey = module.toLowerCase();
  
  // Check role-based permissions
  const hasRolePermission = userPermissions.includes(moduleKey);
  
  // If organization features are provided, check them too
  if (organizationFeatures && Array.isArray(organizationFeatures)) {
    const hasOrgFeature = organizationFeatures.includes(moduleKey);
    // User must have BOTH role permission AND organization feature enabled
    return hasRolePermission && hasOrgFeature;
  }
  
  // If no organization features provided, just check role permission
  return hasRolePermission;
};

/**
 * Check if user has access to multiple modules
 */
export const canAccessAnyModule = (
  userPermissions: string[], 
  modules: string[],
  organizationFeatures?: string[]
): boolean => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  return modules.some(module => canAccessModule(userPermissions, module, organizationFeatures));
};

/**
 * Get accessible routes based on user permissions and organization features
 */
export const getAccessibleRoutes = (userPermissions: string[], organizationFeatures?: string[]) => {
  return {
    dashboard: canAccessModule(userPermissions, 'dashboard', organizationFeatures),
    validator: canAccessModule(userPermissions, 'validator', organizationFeatures),
    reconciliator: canAccessModule(userPermissions, 'reconciliator', organizationFeatures),
    config: canAccessModule(userPermissions, 'config', organizationFeatures),
    migrator: canAccessModule(userPermissions, 'migrator', organizationFeatures),
  };
};
