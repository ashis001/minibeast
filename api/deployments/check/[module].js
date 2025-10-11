module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { module } = req.query;
    
    // For now, return no existing deployments
    // In a full implementation, this would check for existing deployments
    return res.status(200).json({
      success: true,
      hasExistingDeployments: false,
      deployments: [],
      message: `No existing deployments found for module '${module}'`
    });

  } catch (error) {
    console.error('Deployments check failed:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check existing deployments'
    });
  }
};
