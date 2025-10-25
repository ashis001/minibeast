const axios = require('axios');

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://139.59.22.121:8000';

/**
 * Middleware to check if organization is active/paused before allowing API access
 */
async function checkOrgStatus(req, res, next) {
  try {
    // Skip check for non-authenticated routes
    if (!req.user || !req.user.organization_id) {
      return next();
    }

    const orgId = req.user.organization_id;

    const response = await axios.get(
      `${AUTH_SERVER_URL}/license/organization/status/${orgId}`
    );

    // If organization cannot access, block the request
    if (!response.data.can_access) {
      return res.status(403).json({
        success: false,
        error: 'Organization access denied',
        status: response.data.status,
        message: response.data.message,
        blocked: true
      });
    }

    // Organization is active, proceed
    next();
  } catch (error) {
    console.error('Organization status check failed:', error.message);
    // On error, allow request to proceed (fail open)
    // This prevents service disruption if auth server is down
    next();
  }
}

module.exports = checkOrgStatus;
