import snowflake from 'snowflake-sdk';

export default async function handler(req, res) {
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
    const { account, username, password, role, warehouse, database, schema } = req.body;

    if (!account || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: account, username, password'
      });
    }

    // Create Snowflake connection
    const connection = snowflake.createConnection({
      account: account,
      username: username,
      password: password,
      role: role,
      warehouse: warehouse,
      database: database,
      schema: schema
    });

    // Test connection
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) {
          console.error('Snowflake connection failed:', err);
          reject(err);
        } else {
          console.log('Snowflake connection successful');
          resolve(conn);
        }
      });
    });

    // Test a simple query
    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: 'SELECT CURRENT_VERSION()',
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      });
    });

    // Close connection
    connection.destroy();

    return res.status(200).json({
      success: true,
      message: 'Snowflake connection successful'
    });

  } catch (error) {
    console.error('Snowflake connection test failed:', error);
    
    return res.status(400).json({
      success: false,
      message: error.message || 'Snowflake connection failed',
      error: error.code || 'UNKNOWN_ERROR'
    });
  }
}
