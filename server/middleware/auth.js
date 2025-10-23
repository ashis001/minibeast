const jwt = require('jsonwebtoken');
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache license checks for 30 minutes
const licenseCache = new NodeCache({ stdTTL: 1800 });

// Auth server URL from environment
const AUTH_SERVER = process.env.AUTH_SERVER_URL || 'http://localhost:8000';
const JWT_SECRET = process.env.JWT_SECRET || 'MiniAuth2024SecureJWTKey!ChangeInProduction';

/**
 * Middleware to validate JWT token and check license
 */
async function validateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No authentication token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }
    
    // Check license cache first
    const cacheKey = `license_${decoded.organization_id}`;
    let licenseData = licenseCache.get(cacheKey);
    
    if (!licenseData) {
      // Validate with auth server
      try {
        const response = await axios.post(`${AUTH_SERVER}/auth/validate`, {
          user_id: decoded.user_id,
          organization_id: decoded.organization_id
        }, {
          timeout: 5000 // 5 second timeout
        });
        
        licenseData = response.data;
        
        if (!licenseData.valid) {
          return res.status(403).json({ 
            success: false,
            error: 'License expired or invalid',
            license_status: licenseData
          });
        }
        
        // Cache the license data
        licenseCache.set(cacheKey, licenseData);
      } catch (error) {
        console.error('Auth server validation error:', error.message);
        return res.status(503).json({ 
          success: false,
          error: 'Unable to validate license with auth server',
          details: error.message
        });
      }
    }
    
    // Attach user data to request
    req.user = {
      ...decoded,
      license: licenseData.license,
      organization: licenseData.organization
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal authentication error',
      details: error.message 
    });
  }
}

/**
 * Middleware to check if user has specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        success: false,
        error: `Insufficient permissions. Required: ${permission}`,
        user_permissions: userPermissions
      });
    }
    
    next();
  };
}

/**
 * Middleware to check if user has specific role
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: `Insufficient role. Required: ${role}, Your role: ${req.user.role}`
      });
    }
    
    next();
  };
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without auth
  }
  
  // Try to validate but don't fail
  try {
    await validateToken(req, res, next);
  } catch (error) {
    next(); // Continue without auth
  }
}

module.exports = {
  validateToken,
  requirePermission,
  requireRole,
  optionalAuth
};
