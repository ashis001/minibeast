/**
 * Role-based access control utility functions
 */

export const canAccessModule = (userPermissions: string[], module: string): boolean => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  return userPermissions.includes(module.toLowerCase());
};

/**
 * Check if user has access to multiple modules
 */
export const canAccessAnyModule = (userPermissions: string[], modules: string[]): boolean => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  return modules.some(module => userPermissions.includes(module.toLowerCase()));
};

/**
 * Get accessible routes based on user permissions
 */
export const getAccessibleRoutes = (userPermissions: string[]) => {
  return {
    dashboard: canAccessModule(userPermissions, 'dashboard'),
    validator: canAccessModule(userPermissions, 'validator'),
    reconciliator: canAccessModule(userPermissions, 'reconciliator'),
    config: canAccessModule(userPermissions, 'config'),
    migrator: canAccessModule(userPermissions, 'migrator'),
  };
};
