const AWS = require('aws-sdk');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { accessKey, secretKey, region } = req.body;

    if (!accessKey || !secretKey || !region) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: accessKey, secretKey, region'
      });
    }

    // Validate AWS Access Key format
    if (!accessKey.startsWith('AKIA') && !accessKey.startsWith('ASIA')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Access Key format. AWS Access Keys should start with AKIA or ASIA.'
      });
    }

    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region
    });

    // Test AWS connection using STS
    const sts = new AWS.STS();
    const result = await sts.getCallerIdentity().promise();

    return res.status(200).json({
      success: true,
      message: 'AWS connection successful',
      accountId: result.Account,
      userId: result.UserId,
      arn: result.Arn
    });

  } catch (error) {
    console.error('AWS connection test failed:', error);
    
    return res.status(400).json({
      success: false,
      message: error.message || 'AWS connection failed',
      error: error.code || 'UNKNOWN_ERROR'
    });
  }
}
