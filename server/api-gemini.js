const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Test Gemini API connection
router.post('/test-gemini', async (req, res) => {
  try {
    const { api_key } = req.body;

    if (!api_key) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }

    // Test the Gemini API with a simple request
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say "API key valid" if you receive this message.'
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.candidates) {
      // Save config to server
      const configDir = path.join(__dirname, 'configs');
      await fs.mkdir(configDir, { recursive: true });
      
      const geminiConfigPath = path.join(configDir, 'gemini.json');
      await fs.writeFile(geminiConfigPath, JSON.stringify({ api_key }, null, 2));

      return res.json({
        success: true,
        message: 'Gemini API key validated successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: data.error?.message || 'Invalid API key'
      });
    }
  } catch (error) {
    console.error('Gemini test error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to test Gemini API'
    });
  }
});

// Get table schema from Snowflake
router.post('/get-table-schema', async (req, res) => {
  try {
    const { tableName, database, schema, snowflakeConfig } = req.body;

    if (!tableName || !snowflakeConfig) {
      return res.status(400).json({
        success: false,
        message: 'Table name and Snowflake config are required'
      });
    }

    const snowflake = require('snowflake-sdk');
    
    const connection = snowflake.createConnection({
      account: snowflakeConfig.account,
      username: snowflakeConfig.username,
      password: snowflakeConfig.password,
      warehouse: snowflakeConfig.warehouse,
      database: snowflakeConfig.database,
      schema: snowflakeConfig.schema,
      role: snowflakeConfig.role
    });

    return new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        const describeSQL = `DESCRIBE TABLE ${database || snowflakeConfig.database}.${schema || snowflakeConfig.schema}.${tableName}`;

        conn.execute({
          sqlText: describeSQL,
          complete: (err, stmt, rows) => {
            connection.destroy();
            
            if (err) {
              return res.status(400).json({
                success: false,
                message: err.message
              });
            }

            const columns = rows.map(row => ({
              name: row.name,
              type: row.type,
              nullable: row['null?'] === 'Y'
            }));

            return res.json({
              success: true,
              columns,
              tableName
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('Get table schema error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get table schema'
    });
  }
});

// Generate AI validation using Gemini with self-healing
router.post('/generate-validation', async (req, res) => {
  try {
    const { prompt, database, schema, tables, tableColumns, previousError, previousSQL } = req.body;

    // Load Gemini config
    const configDir = path.join(__dirname, 'configs');
    const geminiConfigPath = path.join(configDir, 'gemini.json');
    
    let geminiConfig;
    try {
      const configData = await fs.readFile(geminiConfigPath, 'utf8');
      geminiConfig = JSON.parse(configData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Gemini API key not configured. Please configure it in Settings > AI Models.'
      });
    }

    let systemPrompt;
    
    if (previousError && previousSQL) {
      // Self-healing mode - fix the previous query
      systemPrompt = `You are an expert SQL data validation engineer. The previous query failed with an error.

PREVIOUS QUERY:
${previousSQL}

ERROR:
${previousError}

Fix the query by:
1. Using the exact column names provided in the table schema
2. Ensure all column names are correctly spelled and exist
3. Keep the same validation logic but fix the column references

ONLY output the corrected SQL query, nothing else.`;
    } else {
      // Normal generation mode
      const columnsInfo = tableColumns ? `\n\nACTUAL TABLE COLUMNS:\n${tableColumns.map(c => `- ${c.name} (${c.type}) ${c.nullable ? 'NULL' : 'NOT NULL'}`).join('\n')}\n\n⚠️ IMPORTANT: You MUST use ONLY these exact column names. Do not assume or invent column names.` : '';
      
      systemPrompt = `You are an expert SQL data validation engineer. Generate Snowflake SQL validation queries based on user requirements.

IMPORTANT: Follow this exact pattern for validation queries:

1. Each validation must return 2 columns: "Table Name" and "Status"
2. Status values:
   - 0 = Success (no issues)
   - 1 = Failure (critical issues found)
   - 2 = Warning (threshold breach, some issues but under limit)

3. Use UNION ALL to combine multiple validations

4. Example pattern:
SELECT
    'VALIDATION_NAME' AS "Table Name",
    CASE
        WHEN COUNT(*) = 0 THEN 0       -- Success
        WHEN COUNT(*) > 0 AND COUNT(*) < 50 THEN 2  -- Warning
        ELSE 1                          -- Failure
    END AS "Status"
FROM ${database}.${schema}.TABLE_NAME
WHERE [validation condition]

Database: ${database}
Schema: ${schema}
Available Tables: ${tables ? tables.join(', ') : 'Not specified'}${columnsInfo}

Generate production-quality validation queries. Include appropriate thresholds where needed.`;
    }

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': geminiConfig.api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Request: ${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const generatedSQL = data.candidates[0].content.parts[0].text;
      
      // Extract SQL from markdown code blocks if present
      let cleanedSQL = generatedSQL;
      const sqlMatch = generatedSQL.match(/```sql\n([\s\S]*?)\n```/);
      if (sqlMatch) {
        cleanedSQL = sqlMatch[1];
      }

      return res.json({
        success: true,
        sql: cleanedSQL.trim(),
        raw_response: generatedSQL
      });
    } else {
      return res.status(400).json({
        success: false,
        message: data.error?.message || 'Failed to generate validation'
      });
    }
  } catch (error) {
    console.error('Gemini generation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate validation'
    });
  }
});

// Test a query against Snowflake
router.post('/test-query', async (req, res) => {
  try {
    const { query, snowflakeConfig } = req.body;

    if (!query || !snowflakeConfig) {
      return res.status(400).json({
        success: false,
        message: 'Query and Snowflake config are required'
      });
    }

    const snowflake = require('snowflake-sdk');
    
    const connection = snowflake.createConnection({
      account: snowflakeConfig.account,
      username: snowflakeConfig.username,
      password: snowflakeConfig.password,
      warehouse: snowflakeConfig.warehouse,
      database: snowflakeConfig.database,
      schema: snowflakeConfig.schema,
      role: snowflakeConfig.role
    });

    connection.connect((err, conn) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      conn.execute({
        sqlText: query,
        complete: (err, stmt, rows) => {
          connection.destroy();
          
          if (err) {
            return res.status(400).json({
              success: false,
              message: err.message
            });
          }

          return res.json({
            success: true,
            results: rows,
            rowCount: rows ? rows.length : 0
          });
        }
      });
    });
  } catch (error) {
    console.error('Test query error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to test query'
    });
  }
});

// Save AI validation to history
router.post('/save-ai-validation', async (req, res) => {
  try {
    const { prompt, sql, database, schema, testResult } = req.body;

    const historyDir = path.join(__dirname, 'ai-validations');
    await fs.mkdir(historyDir, { recursive: true });

    const validation = {
      id: `ai-val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt,
      sql,
      database,
      schema,
      testResult,
      createdAt: new Date().toISOString(),
      isActive: false
    };

    const historyFile = path.join(historyDir, 'history.json');
    let history = [];
    
    try {
      const data = await fs.readFile(historyFile, 'utf8');
      history = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start fresh
    }

    history.unshift(validation);
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2));

    return res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Save AI validation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save validation'
    });
  }
});

// Get all AI validations
router.get('/ai-validations', async (req, res) => {
  try {
    const historyFile = path.join(__dirname, 'ai-validations/history.json');
    
    try {
      const data = await fs.readFile(historyFile, 'utf8');
      const validations = JSON.parse(data);
      return res.json({
        success: true,
        validations
      });
    } catch (error) {
      // No history file yet
      return res.json({
        success: true,
        validations: []
      });
    }
  } catch (error) {
    console.error('Get AI validations error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get validations'
    });
  }
});

// Toggle AI validation active status (saves to Snowflake config table when activated)
router.post('/toggle-ai-validation', async (req, res) => {
  try {
    const { id, isActive, snowflakeConfig } = req.body;

    // Load validation from history
    const historyFile = path.join(__dirname, 'ai-validations/history.json');
    const data = await fs.readFile(historyFile, 'utf8');
    let history = JSON.parse(data);
    
    const validation = history.find(v => v.id === id);
    if (!validation) {
      return res.status(404).json({
        success: false,
        message: 'Validation not found'
      });
    }

    // Update active status
    validation.isActive = isActive;
    
    // If activating, save to Snowflake config table
    if (isActive && snowflakeConfig) {
      const snowflake = require('snowflake-sdk');
      
      const connection = snowflake.createConnection({
        account: snowflakeConfig.account,
        username: snowflakeConfig.username,
        password: snowflakeConfig.password,
        warehouse: snowflakeConfig.warehouse,
        database: snowflakeConfig.database,
        schema: snowflakeConfig.schema,
        role: snowflakeConfig.role
      });

      await new Promise((resolve, reject) => {
        connection.connect((err, conn) => {
          if (err) return reject(err);

          // Insert into Snowflake config table
          const insertSQL = `
            INSERT INTO ${snowflakeConfig.database}.${snowflakeConfig.schema}.MINIBEAST_VALIDATION_CONFIG
            (ID, ENTITY, DESCRIPTION, SQL_QUERY, CREATED_BY, SOURCE)
            VALUES (?, ?, ?, ?, ?, ?)
          `;

          conn.execute({
            sqlText: insertSQL,
            binds: [
              validation.id,
              'AI_GENERATED',
              validation.prompt,
              validation.sql,
              'AI',
              'AI_GENERATOR'
            ],
            complete: (err, stmt, rows) => {
              connection.destroy();
              if (err) return reject(err);
              resolve(rows);
            }
          });
        });
      });
    } else if (!isActive && snowflakeConfig) {
      // If deactivating, remove from Snowflake
      const snowflake = require('snowflake-sdk');
      
      const connection = snowflake.createConnection({
        account: snowflakeConfig.account,
        username: snowflakeConfig.username,
        password: snowflakeConfig.password,
        warehouse: snowflakeConfig.warehouse,
        database: snowflakeConfig.database,
        schema: snowflakeConfig.schema,
        role: snowflakeConfig.role
      });

      await new Promise((resolve, reject) => {
        connection.connect((err, conn) => {
          if (err) return reject(err);

          const deleteSQL = `
            DELETE FROM ${snowflakeConfig.database}.${snowflakeConfig.schema}.MINIBEAST_VALIDATION_CONFIG
            WHERE ID = ?
          `;

          conn.execute({
            sqlText: deleteSQL,
            binds: [validation.id],
            complete: (err, stmt, rows) => {
              connection.destroy();
              if (err) return reject(err);
              resolve(rows);
            }
          });
        });
      });
    }

    // Update history file
    history = history.map(v => v.id === id ? validation : v);
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2));

    return res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Toggle AI validation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle validation'
    });
  }
});

// Delete AI validation
router.post('/delete-ai-validation', async (req, res) => {
  try {
    const { id } = req.body;

    const historyFile = path.join(__dirname, 'ai-validations/history.json');
    const data = await fs.readFile(historyFile, 'utf8');
    let history = JSON.parse(data);
    
    history = history.filter(v => v.id !== id);
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2));

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('Delete AI validation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete validation'
    });
  }
});

module.exports = router;
